// tools/core.ts — Core tools: optimize_prompt (METERED), refine_prompt (METERED),
// pre_flight (METERED), check_prompt (FREE).

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { analyzePrompt, detectTaskType, classifyComplexity } from '../analyzer.js';
import { compilePrompt, compressContext } from '../compiler.js';
import { scorePrompt, generateChecklist } from '../scorer.js';
import { estimateCost, estimateTokens, routeModel } from '../estimator.js';
import { createSession, getSession, updateSession } from '../session.js';
import { runRules, computeRiskScore, computeRiskScoreWithCustomRules, extractBlockingQuestions } from '../rules.js';
import { sortIssues } from '../sort.js';
import { suggestProfile } from '../profiles.js';
import { calculateCompressionDelta } from '../deltas.js';
import type {
  PreviewPack, StorageInterface, RateLimiter,
  OutputTarget, ModelRoutingInput, OptimizationProfile,
} from '../types.js';
import {
  hardenInput, jsonResponse, errorResponse, buildCtx, log,
  PRO_PURCHASE_URL, POWER_PURCHASE_URL, ENTERPRISE_PURCHASE_URL,
  STRICTNESS_THRESHOLDS,
} from './helpers.js';

export function registerCoreTools(
  server: McpServer,
  storage: StorageInterface,
  rateLimiter: RateLimiter,
  engineVersion?: string,
): void {

  // ══════════════════════════════════════════════════════════════════════════════
  // Tool 1: optimize_prompt (METERED)
  // ══════════════════════════════════════════════════════════════════════════════

  server.tool(
    'optimize_prompt',
    'Analyze a raw prompt, detect ambiguities, compile an optimized version, score quality, and estimate cost across providers. Returns a PreviewPack for review.',
    {
      raw_prompt: z.string().min(1).max(102400).describe('The raw user prompt to optimize'),
      context: z.string().max(102400).optional().describe('Optional context: repo info, file contents, preferences'),
      target: z.enum(['claude', 'openai', 'google', 'perplexity', 'generic']).default('claude').describe('Output/provider target: claude (XML), openai (system/user), google/perplexity/generic (markdown)'),
    },
    async ({ raw_prompt, context, target }) => {
      const ctx = await buildCtx(storage, rateLimiter);
      const { requestId } = ctx;

      try {
        // Harden inputs
        raw_prompt = hardenInput(raw_prompt);
        if (context) context = hardenInput(context);

        // Use config default_target if none specified
        const outputTarget: OutputTarget = target || ctx.config.default_target;

        // Freemium gate (I4: rate limit enforced inside canUseOptimization)
        const enforcement = await storage.canUseOptimization(ctx);
        if (!enforcement.allowed) {
          const isRateLimit = enforcement.enforcement === 'rate';
          return jsonResponse({
            request_id: requestId,
            error: isRateLimit ? 'rate_limited' : 'free_tier_limit_reached',
            enforcement: enforcement.enforcement,
            remaining: enforcement.remaining,
            limits: enforcement.limits,
            tier: enforcement.usage.tier,
            ...(enforcement.retry_after_seconds != null && {
              retry_after_seconds: enforcement.retry_after_seconds,
            }),
            ...(!isRateLimit && {
              pro_purchase_url: PRO_PURCHASE_URL,
              power_purchase_url: POWER_PURCHASE_URL,
              enterprise_purchase_url: ENTERPRISE_PURCHASE_URL,
              next_step: 'You\'ve hit your plan limit. Upgrade to Pro (₹499/mo), Power (₹899/mo), or contact us for Enterprise — then run set_license with your key.',
            }),
          });
        }

        // Storage health check (I5)
        const storageHealth = await storage.health();
        if (storageHealth === 'degraded') {
          log.warn(requestId, 'Storage degraded — proceeding with fail-open (Phase A)');
        }

        // Policy enforcement gate (v3.3.0) — Enterprise only (v4.0.0)
        if (ctx.config.policy_mode === 'enforce' && ctx.tier === 'enterprise') {
          const { evaluatePolicyViolations } = await import('../policy.js');
          const policyRuleResults = runRules(raw_prompt, context);
          const violations = evaluatePolicyViolations(policyRuleResults, ctx.config);
          if (violations.length > 0) {
            // Audit blocked attempt
            if (ctx.config.audit_log) {
              const { auditLogger } = await import('../auditLog.js');
              await auditLogger.append({
                timestamp: new Date().toISOString(),
                event: 'optimize',
                request_id: requestId,
                policy_mode: 'enforce',
                outcome: 'blocked',
                details: { violation_count: violations.length },
              });
            }
            return errorResponse({
              request_id: requestId,
              error: 'policy_violation',
              code: 'policy_violation',
              message: `Policy enforcement blocked optimization: ${violations.length} BLOCKING rule(s) triggered.`,
              policy_mode: 'enforce',
              violations,
            });
          }
        }

        // Pipeline
        const intentSpec = analyzePrompt(raw_prompt, context);
        const qualityBefore = scorePrompt(intentSpec, context);
        const { prompt: compiledPrompt, changes } = compilePrompt(intentSpec, context, outputTarget);
        const checklist = generateChecklist(compiledPrompt);
        const costEstimate = estimateCost(
          compiledPrompt + (context || ''),
          intentSpec.task_type,
          intentSpec.risk_level,
          outputTarget,
        );

        // Create session
        const session = await createSession(storage, {
          raw_prompt,
          context,
          target: outputTarget,
          intent_spec: intentSpec,
          compiled_prompt: compiledPrompt,
          quality_before: qualityBefore,
          compilation_checklist: checklist,
          cost_estimate: costEstimate,
        });

        // State depends on blocking questions
        const state = intentSpec.blocking_questions.length > 0 ? 'ANALYZING' : 'COMPILED';
        await updateSession(storage, session.id, { state });

        // Build PreviewPack (I2: request_id on all responses)
        const preview: PreviewPack = {
          request_id: requestId,
          session_id: session.id,
          state,
          intent_spec: intentSpec,
          quality_before: qualityBefore,
          compiled_prompt: compiledPrompt,
          compilation_checklist: checklist,
          blocking_questions: intentSpec.blocking_questions,
          assumptions: intentSpec.assumptions,
          cost_estimate: costEstimate,
          model_recommendation: costEstimate.recommended_model,
          changes_made: changes,
          target: outputTarget,
          format_version: 1,
          scoring_version: 2,
          ...(storageHealth === 'degraded' && { storage_health: 'degraded' }),
        };

        // I3: Metering-after-success — only increment if pipeline succeeded
        let success = false;
        try {
          // All 4 conditions met: validation passed, compiler succeeded, no error, no rate denial
          success = true;
        } finally {
          if (success) {
            await storage.incrementUsage();
            await storage.updateStats({
              type: 'optimize',
              score_before: qualityBefore.total,
              task_type: intentSpec.task_type,
              blocking_questions: intentSpec.blocking_questions.map(q => q.question),
              cost_savings_usd: costEstimate.costs.length > 1
                ? Math.max(0, costEstimate.costs[costEstimate.costs.length - 1].total_cost_usd - costEstimate.costs[0].total_cost_usd)
                : 0,
            });
          }
        }

        // Audit success (v3.3.0)
        if (ctx.config.audit_log) {
          const { auditLogger } = await import('../auditLog.js');
          await auditLogger.append({
            timestamp: new Date().toISOString(),
            event: 'optimize',
            session_id: session.id,
            request_id: requestId,
            task_type: intentSpec.task_type,
            policy_mode: ctx.config.policy_mode || 'advisory',
            outcome: 'success',
          });
        }

        log.info(requestId, `optimize_prompt: score=${qualityBefore.total}, target=${outputTarget}, task=${intentSpec.task_type}`);
        log.prompt(requestId, 'raw_prompt', raw_prompt);

        return jsonResponse({
          ...preview,
          policy_mode: ctx.config.policy_mode || 'advisory',
        });
      } catch (err) {
        log.error(requestId, 'optimize_prompt failed:', err instanceof Error ? err.message : String(err));
        return errorResponse({
          request_id: requestId,
          error: 'internal_error',
          message: `optimize_prompt failed: ${err instanceof Error ? err.message : 'unknown error'}`,
        });
      }
    },
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // Tool 2: refine_prompt (METERED)
  // ══════════════════════════════════════════════════════════════════════════════

  server.tool(
    'refine_prompt',
    'Refine a prompt by answering blocking questions or providing manual edits. Re-runs analysis and returns updated PreviewPack.',
    {
      session_id: z.string().regex(/^[a-zA-Z0-9-]+$/).describe('Session ID from optimize_prompt'),
      answers: z.record(z.string(), z.string()).optional().describe('Answers to blocking questions: { question_id: answer }'),
      edits: z.string().optional().describe('Manual edits or additional context to incorporate'),
      target: z.enum(['claude', 'openai', 'google', 'perplexity', 'generic']).optional().describe('Change output/provider target'),
    },
    async ({ session_id, answers, edits, target }) => {
      const ctx = await buildCtx(storage, rateLimiter);
      const { requestId } = ctx;

      try {
        // Freemium gate (I4)
        const enforcement = await storage.canUseOptimization(ctx);
        if (!enforcement.allowed) {
          const isRateLimit = enforcement.enforcement === 'rate';
          return jsonResponse({
            request_id: requestId,
            error: isRateLimit ? 'rate_limited' : 'free_tier_limit_reached',
            enforcement: enforcement.enforcement,
            remaining: enforcement.remaining,
            limits: enforcement.limits,
            tier: enforcement.usage.tier,
            ...(enforcement.retry_after_seconds != null && {
              retry_after_seconds: enforcement.retry_after_seconds,
            }),
            ...(!isRateLimit && {
              pro_purchase_url: PRO_PURCHASE_URL,
              power_purchase_url: POWER_PURCHASE_URL,
              enterprise_purchase_url: ENTERPRISE_PURCHASE_URL,
              next_step: 'You\'ve hit your plan limit. Upgrade to Pro (₹499/mo), Power (₹899/mo), or contact us for Enterprise — then run set_license with your key.',
            }),
          });
        }

        const session = await getSession(storage, session_id);
        if (!session) {
          return errorResponse({
            request_id: requestId,
            error: 'session_not_found',
            message: 'Session not found or expired.',
          });
        }

        const storageHealth = await storage.health();
        if (storageHealth === 'degraded') {
          log.warn(requestId, 'Storage degraded — proceeding with fail-open (Phase A)');
        }

        // Merge answers
        if (answers) {
          Object.assign(session.answers, answers);
        }

        // Build enriched prompt
        let enrichedPrompt = session.raw_prompt;
        if (answers && Object.keys(answers).length > 0) {
          const answerText = Object.entries(answers)
            .map(([qId, answer]) => {
              const question = session.intent_spec.blocking_questions.find(q => q.id === qId);
              return question ? `${question.question} → ${hardenInput(answer)}` : `${qId}: ${hardenInput(answer)}`;
            })
            .join('\n');
          enrichedPrompt += `\n\nAdditional context from user:\n${answerText}`;
        }
        if (edits) {
          enrichedPrompt += `\n\n${hardenInput(edits)}`;
        }

        const outputTarget: OutputTarget = target || session.target;

        // Re-analyze
        const answeredIds = new Set(Object.keys(session.answers));
        const intentSpec = analyzePrompt(enrichedPrompt, session.context, answeredIds);
        const qualityBefore = scorePrompt(intentSpec, session.context);
        const { prompt: compiledPrompt, changes } = compilePrompt(intentSpec, session.context, outputTarget);
        const checklist = generateChecklist(compiledPrompt);
        const costEstimate = estimateCost(
          compiledPrompt + (session.context || ''),
          intentSpec.task_type,
          intentSpec.risk_level,
          outputTarget,
        );

        const state = intentSpec.blocking_questions.length > 0 ? 'ANALYZING' : 'COMPILED';

        await updateSession(storage, session_id, {
          intent_spec: intentSpec,
          compiled_prompt: compiledPrompt,
          quality_before: qualityBefore,
          compilation_checklist: checklist,
          cost_estimate: costEstimate,
          target: outputTarget,
          state,
        });

        const preview: PreviewPack = {
          request_id: requestId,
          session_id,
          state,
          intent_spec: intentSpec,
          quality_before: qualityBefore,
          compiled_prompt: compiledPrompt,
          compilation_checklist: checklist,
          blocking_questions: intentSpec.blocking_questions,
          assumptions: intentSpec.assumptions,
          cost_estimate: costEstimate,
          model_recommendation: costEstimate.recommended_model,
          changes_made: changes,
          target: outputTarget,
          format_version: 1,
          scoring_version: 2,
          ...(storageHealth === 'degraded' && { storage_health: 'degraded' }),
        };

        // I3: Metering-after-success
        let success = false;
        try {
          success = true;
        } finally {
          if (success) {
            await storage.incrementUsage();
            await storage.updateStats({
              type: 'optimize',
              score_before: qualityBefore.total,
              task_type: intentSpec.task_type,
              blocking_questions: intentSpec.blocking_questions.map(q => q.question),
            });
          }
        }

        log.info(requestId, `refine_prompt: session=${session_id}, score=${qualityBefore.total}`);
        return jsonResponse(preview);
      } catch (err) {
        log.error(requestId, 'refine_prompt failed:', err instanceof Error ? err.message : String(err));
        return errorResponse({
          request_id: requestId,
          error: 'internal_error',
          message: `refine_prompt failed: ${err instanceof Error ? err.message : 'unknown error'}`,
        });
      }
    },
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // Tool 14: pre_flight (METERED — G6: counts as 1 optimization use)
  // ══════════════════════════════════════════════════════════════════════════════

  server.tool(
    'pre_flight',
    'Full pre-flight analysis: classify task, assess risk, route model, score quality. Returns complete decision bundle. Metered — counts as 1 optimization use.',
    {
      prompt: z.string().min(1).max(102400).describe('The prompt to analyze'),
      context: z.string().max(102400).optional().describe('Optional context'),
      profile: z.enum([
        'cost_minimizer', 'balanced', 'quality_first', 'creative', 'enterprise_safe',
      ]).optional().describe('Optimization profile'),
      budgetSensitivity: z.enum(['low', 'medium', 'high']).optional().describe('Budget sensitivity'),
      latencySensitivity: z.enum(['low', 'medium', 'high']).optional().describe('Latency sensitivity'),
      target: z.enum(['claude', 'openai', 'google', 'perplexity', 'generic']).default('claude').describe('Output/provider target'),
    },
    async ({ prompt, context, profile, budgetSensitivity, latencySensitivity, target }) => {
      const ctx = await buildCtx(storage, rateLimiter);
      const { requestId } = ctx;

      try {
        prompt = hardenInput(prompt);
        if (context) context = hardenInput(context);

        const outputTarget: OutputTarget = target || ctx.config.default_target;

        // Freemium gate (G6: pre_flight is metered)
        const enforcement = await storage.canUseOptimization(ctx);
        if (!enforcement.allowed) {
          const isRateLimit = enforcement.enforcement === 'rate';
          return jsonResponse({
            request_id: requestId,
            error: isRateLimit ? 'rate_limited' : 'free_tier_limit_reached',
            enforcement: enforcement.enforcement,
            remaining: enforcement.remaining,
            limits: enforcement.limits,
            tier: enforcement.usage.tier,
            ...(enforcement.retry_after_seconds != null && {
              retry_after_seconds: enforcement.retry_after_seconds,
            }),
            ...(!isRateLimit && {
              pro_purchase_url: PRO_PURCHASE_URL,
              power_purchase_url: POWER_PURCHASE_URL,
              enterprise_purchase_url: ENTERPRISE_PURCHASE_URL,
              next_step: 'You\'ve hit your plan limit. Upgrade to Pro (₹499/mo), Power (₹899/mo), or contact us for Enterprise — then run set_license with your key.',
            }),
          });
        }

        // 1. Task type detection
        const taskType = detectTaskType(prompt);

        // 2. Complexity classification
        const complexityResult = classifyComplexity(prompt, context);

        // 3. Risk scoring (custom rules: enterprise only — v4.0.0)
        const ruleResults = runRules(prompt, context, taskType);
        const { riskScore: riskScoreResult } = ctx.tier === 'enterprise'
          ? await computeRiskScoreWithCustomRules(ruleResults, prompt, taskType)
          : { riskScore: computeRiskScore(ruleResults) };
        const blockingQuestions = extractBlockingQuestions(ruleResults);
        const warnings = ruleResults
          .filter(r => r.triggered && r.severity === 'non_blocking')
          .map(r => r.message);

        // 4. Suggested profile
        const suggestedProfileName = suggestProfile(complexityResult.complexity, riskScoreResult.score);

        // 5. Model routing
        const contextTokens = estimateTokens(prompt + (context || ''));
        const routingInput: ModelRoutingInput = {
          taskType,
          complexity: complexityResult.complexity,
          budgetSensitivity: budgetSensitivity || 'medium',
          latencySensitivity: latencySensitivity || 'medium',
          contextTokens,
          riskScore: riskScoreResult.score,
          profile: (profile || suggestedProfileName) as OptimizationProfile,
        };
        const recommendation = routeModel(routingInput, prompt, complexityResult.confidence, outputTarget);

        // 6. Quality score
        const intentSpec = analyzePrompt(prompt, context);
        const qualityScore = scorePrompt(intentSpec, context);

        // 7. Compression delta (conditional — only when context is provided)
        let compressionDelta: { tokens_saved_estimate: number; percentage_reduction: number } | undefined;
        if (context && context.length > 0) {
          try {
            const compressionResult = compressContext(context, intentSpec);
            const delta = calculateCompressionDelta(compressionResult as any);
            if (delta) {
              compressionDelta = {
                tokens_saved_estimate: delta.tokens_saved_estimate,
                percentage_reduction: delta.percentage_reduction,
              };
            }
          } catch {
            // Compression delta is best-effort; don't fail pre_flight
          }
        }

        // Summary line
        const summary = `${complexityResult.complexity} task → ${recommendation.primary.provider}/${recommendation.primary.model} recommended. Risk score: ${riskScoreResult.score}/100. Quality: ${qualityScore.total}/100. Est. cost: $${recommendation.costEstimate.costs.find(c => c.model === recommendation.primary.model)?.total_cost_usd?.toFixed(4) ?? 'N/A'}.`;

        // G6: Metering after success — counts as 1 optimization use
        let success = false;
        try {
          success = true;
        } finally {
          if (success) {
            await storage.incrementUsage();
            await storage.updateStats({
              type: 'optimize',
              score_before: qualityScore.total,
              task_type: taskType,
              blocking_questions: blockingQuestions.map(q => q.question),
            });
          }
        }

        // Policy enforcement summary (v3.3.0 — only when enforce mode)
        let policyEnforcement: { mode: string; violations: unknown[]; risk_threshold_exceeded: boolean; blocked: boolean } | undefined;
        if (ctx.config.policy_mode === 'enforce') {
          const { evaluatePolicyViolations, checkRiskThreshold, buildPolicyEnforcementSummary } = await import('../policy.js');
          const violations = evaluatePolicyViolations(ruleResults, ctx.config);
          const riskCheck = checkRiskThreshold(riskScoreResult.score, ctx.config.strictness);
          policyEnforcement = buildPolicyEnforcementSummary(violations, riskCheck);
        }

        log.info(requestId, `pre_flight: ${complexityResult.complexity}/${riskScoreResult.level} → ${recommendation.primary.model}`);
        return jsonResponse({
          request_id: requestId,
          schema_version: 1,
          classification: {
            taskType,
            complexity: complexityResult.complexity,
            complexityConfidence: complexityResult.confidence,
            riskLevel: riskScoreResult.level,
            riskScore: riskScoreResult.score,
            riskDimensions: riskScoreResult.dimensions,
            signals: complexityResult.signals,
          },
          model: recommendation,
          qualityScore: qualityScore.total,
          risks: {
            score: riskScoreResult.score,
            dimensions: riskScoreResult.dimensions,
            warnings,
            blockingQuestions: blockingQuestions.map(q => q.question),
          },
          profile: profile || suggestedProfileName,
          ...(compressionDelta && { compression_delta: compressionDelta }),
          policy_mode: ctx.config.policy_mode || 'advisory',
          ...(policyEnforcement && { policy_enforcement: policyEnforcement }),
          summary,
        });
      } catch (err) {
        log.error(requestId, 'pre_flight failed:', err instanceof Error ? err.message : String(err));
        return errorResponse({
          request_id: requestId,
          error: 'internal_error',
          message: `pre_flight failed: ${err instanceof Error ? err.message : 'unknown error'}`,
        });
      }
    },
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // Tool 6: check_prompt (FREE)
  // ══════════════════════════════════════════════════════════════════════════════

  server.tool(
    'check_prompt',
    'Quick pass/fail check of a prompt. Returns score, top issues, and a suggestion. No compilation, no session.',
    {
      raw_prompt: z.string().min(1).max(102400).describe('The prompt to check'),
      context: z.string().max(102400).optional().describe('Optional context'),
    },
    async ({ raw_prompt, context }) => {
      const ctx = await buildCtx(storage, rateLimiter);
      const { requestId } = ctx;

      try {
        raw_prompt = hardenInput(raw_prompt);
        if (context) context = hardenInput(context);

        const taskType = detectTaskType(raw_prompt);
        const intentSpec = analyzePrompt(raw_prompt, context);
        const score = scorePrompt(intentSpec, context);

        // Threshold from config or strictness map
        const threshold = ctx.config.threshold || STRICTNESS_THRESHOLDS[ctx.config.strictness] || 60;
        const pass = score.total >= threshold;

        // Top 2 issues from rules (sorted deterministically: severity desc, rule asc)
        const ruleResults = runRules(raw_prompt, context, taskType);
        const sorted = sortIssues(ruleResults);
        const topIssues = sorted.slice(0, 2).map(r => ({
          rule: r.rule_name,
          severity: r.severity,
          message: r.message,
        }));

        const suggestion = pass
          ? 'Prompt meets quality threshold. Consider using optimize_prompt for further improvements.'
          : 'Prompt is below quality threshold. Use optimize_prompt to improve it.';

        log.info(requestId, `check_prompt: score=${score.total}, pass=${pass}, task=${taskType}`);
        return jsonResponse({
          request_id: requestId,
          score: score.total,
          max: score.max,
          pass,
          threshold,
          task_type: taskType,
          top_issues: topIssues,
          blocking_questions_count: intentSpec.blocking_questions.length,
          suggestion,
        });
      } catch (err) {
        log.error(requestId, 'check_prompt failed:', err instanceof Error ? err.message : String(err));
        return errorResponse({
          request_id: requestId,
          error: 'internal_error',
          message: `check_prompt failed: ${err instanceof Error ? err.message : 'unknown error'}`,
        });
      }
    },
  );
}
