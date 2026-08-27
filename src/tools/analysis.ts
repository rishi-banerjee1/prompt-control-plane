// tools/analysis.ts — Analysis/utility tools:
// approve_prompt (FREE), estimate_cost (FREE), compress_context (FREE),
// classify_task (FREE), route_model (FREE), prompt_stats (FREE), prune_tools (FREE).

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { analyzePrompt, detectTaskType, classifyComplexity } from '../analyzer.js';
import { compressContext } from '../compiler.js';
import { scorePrompt, generateChecklist } from '../scorer.js';
import { estimateCostForText, estimateTokens, routeModel } from '../estimator.js';
import { getSession, updateSession } from '../session.js';
import { runRules, computeRiskScore, computeRiskScoreWithCustomRules } from '../rules.js';
import { sortCountsDescKeyAsc } from '../sort.js';
import { suggestProfile } from '../profiles.js';
import { scoreAllTools, rankTools, pruneTools } from '../pruner.js';
import type { ToolDefinition } from '../pruner.js';
import type {
  StorageInterface, RateLimiter,
  OutputTarget, ModelRoutingInput, OptimizationProfile,
} from '../types.js';
import {
  hardenInput, jsonResponse, errorResponse, buildCtx, log,
  PRO_PURCHASE_URL, POWER_PURCHASE_URL, ENTERPRISE_PURCHASE_URL,
} from './helpers.js';

export function registerAnalysisTools(
  server: McpServer,
  storage: StorageInterface,
  rateLimiter: RateLimiter,
  engineVersion?: string,
): void {

  // ══════════════════════════════════════════════════════════════════════════════
  // Tool 3: approve_prompt (FREE)
  // ══════════════════════════════════════════════════════════════════════════════

  server.tool(
    'approve_prompt',
    'Approve the compiled prompt. Returns the final optimized prompt ready for use.',
    {
      session_id: z.string().regex(/^[a-zA-Z0-9-]+$/).describe('Session ID from optimize_prompt'),
    },
    async ({ session_id }) => {
      const ctx = await buildCtx(storage, rateLimiter);
      const { requestId } = ctx;

      try {
        const session = await getSession(storage, session_id);
        if (!session) {
          return errorResponse({
            request_id: requestId,
            error: 'session_not_found',
            message: 'Session not found or expired.',
          });
        }

        if (session.intent_spec.blocking_questions.length > 0) {
          return errorResponse({
            request_id: requestId,
            error: 'blocking_questions_remain',
            message: `Cannot approve: ${session.intent_spec.blocking_questions.length} blocking question(s) remain. Use refine_prompt first.`,
          });
        }

        // Policy enforcement gate (v3.3.0) — Enterprise only (v4.0.0)
        if (ctx.config.policy_mode === 'enforce' && ctx.tier === 'enterprise') {
          const { evaluatePolicyViolations, checkRiskThreshold } = await import('../policy.js');

          // Check BLOCKING violations
          const policyRuleResults = runRules(session.raw_prompt, session.context, session.intent_spec.task_type);
          const violations = evaluatePolicyViolations(policyRuleResults, ctx.config);
          if (violations.length > 0) {
            if (ctx.config.audit_log) {
              const { auditLogger } = await import('../auditLog.js');
              await auditLogger.append({
                timestamp: new Date().toISOString(),
                event: 'approve',
                session_id: session_id,
                request_id: requestId,
                policy_mode: 'enforce',
                outcome: 'blocked',
                details: { reason: 'policy_violation', violation_count: violations.length },
              });
            }
            return errorResponse({
              request_id: requestId,
              error: 'policy_violation',
              code: 'policy_violation',
              message: `Policy enforcement blocked approval: ${violations.length} BLOCKING rule(s) triggered.`,
              policy_mode: 'enforce',
              violations,
            });
          }

          // Check risk threshold
          const { riskScore: riskScoreResult } = await computeRiskScoreWithCustomRules(
            policyRuleResults, session.raw_prompt, session.intent_spec.task_type,
          );
          const riskCheck = checkRiskThreshold(riskScoreResult.score, ctx.config.strictness);
          if (riskCheck.exceeded) {
            if (ctx.config.audit_log) {
              const { auditLogger } = await import('../auditLog.js');
              await auditLogger.append({
                timestamp: new Date().toISOString(),
                event: 'approve',
                session_id: session_id,
                request_id: requestId,
                risk_score: riskCheck.score,
                policy_mode: 'enforce',
                outcome: 'blocked',
                details: { reason: 'risk_threshold_exceeded', threshold: riskCheck.threshold, strictness: ctx.config.strictness },
              });
            }
            return errorResponse({
              request_id: requestId,
              error: 'risk_threshold_exceeded',
              code: 'risk_threshold_exceeded',
              message: `Risk score ${riskCheck.score} exceeds ${ctx.config.strictness} threshold ${riskCheck.threshold} (blocked when score >= threshold).`,
              policy_mode: 'enforce',
              risk_score: riskCheck.score,
              threshold: riskCheck.threshold,
              strictness: ctx.config.strictness,
            });
          }
        }

        await updateSession(storage, session_id, { state: 'APPROVED' });

        await storage.updateStats({ type: 'approve' });

        // Audit success (v3.3.0)
        if (ctx.config.audit_log) {
          const { auditLogger } = await import('../auditLog.js');
          await auditLogger.append({
            timestamp: new Date().toISOString(),
            event: 'approve',
            session_id: session_id,
            request_id: requestId,
            policy_mode: ctx.config.policy_mode || 'advisory',
            outcome: 'success',
          });
        }

        // Calculate policy_hash for response (v3.3.0)
        let policyHash: string | undefined;
        if (ctx.config.policy_mode === 'enforce') {
          const { calculatePolicyHash } = await import('../policy.js');
          const { calculateBuiltInRuleSetHash } = await import('../rules.js');
          const { customRules } = await import('../customRules.js');
          const customRulesList = await customRules.getRulesForTask(session.intent_spec.task_type);
          policyHash = calculatePolicyHash({
            builtInRuleSetHash: calculateBuiltInRuleSetHash(),
            customRuleSetHash: customRules.calculateRuleSetHash(customRulesList),
            policyMode: ctx.config.policy_mode,
            strictness: ctx.config.strictness,
          });
        }

        log.info(requestId, `approve_prompt: session=${session_id}`);
        return jsonResponse({
          request_id: requestId,
          status: 'APPROVED',
          compiled_prompt: session.compiled_prompt,
          quality_score_before: session.quality_before.total,
          cost_estimate: session.cost_estimate,
          model_recommendation: session.cost_estimate.recommended_model,
          recommendation_reason: session.cost_estimate.recommendation_reason,
          policy_mode: ctx.config.policy_mode || 'advisory',
          ...(policyHash && { policy_hash: policyHash }),
        });
      } catch (err) {
        log.error(requestId, 'approve_prompt failed:', err instanceof Error ? err.message : String(err));
        return errorResponse({
          request_id: requestId,
          error: 'internal_error',
          message: `approve_prompt failed: ${err instanceof Error ? err.message : 'unknown error'}`,
        });
      }
    },
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // Tool 4: estimate_cost (FREE)
  // ══════════════════════════════════════════════════════════════════════════════

  server.tool(
    'estimate_cost',
    'Estimate token count and cost across providers for any prompt text. No session needed.',
    {
      prompt_text: z.string().min(1).max(102400).describe('The prompt text to estimate cost for'),
      target: z.enum(['claude', 'openai', 'google', 'perplexity', 'generic']).default('claude').describe('Target platform for model recommendations'),
    },
    async ({ prompt_text, target }) => {
      const ctx = await buildCtx(storage, rateLimiter);
      const { requestId } = ctx;

      try {
        prompt_text = hardenInput(prompt_text);
        const outputTarget: OutputTarget = target || ctx.config.default_target;
        const estimate = estimateCostForText(prompt_text, outputTarget);

        log.info(requestId, `estimate_cost: tokens=${estimate.input_tokens}`);
        return jsonResponse({
          request_id: requestId,
          ...estimate,
        });
      } catch (err) {
        log.error(requestId, 'estimate_cost failed:', err instanceof Error ? err.message : String(err));
        return errorResponse({
          request_id: requestId,
          error: 'internal_error',
          message: `estimate_cost failed: ${err instanceof Error ? err.message : 'unknown error'}`,
        });
      }
    },
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // Tool 5: compress_context (FREE)
  // ══════════════════════════════════════════════════════════════════════════════

  server.tool(
    'compress_context',
    'Compress context (code, docs) by removing irrelevant sections. Returns pruned context with token savings.',
    {
      context: z.string().min(1).max(102400).describe('The context text to compress'),
      intent: z.string().min(1).describe('What the task is about — used to determine relevance'),
    },
    async ({ context, intent }) => {
      const ctx = await buildCtx(storage, rateLimiter);
      const { requestId } = ctx;

      try {
        context = hardenInput(context);
        intent = hardenInput(intent);
        const result = compressContext(context, intent);

        log.info(requestId, `compress_context: ${result.originalTokens} → ${result.compressedTokens} tokens`);
        return jsonResponse({
          request_id: requestId,
          compressed_context: result.compressed,
          removed_sections: result.removed,
          original_tokens: result.originalTokens,
          compressed_tokens: result.compressedTokens,
          tokens_saved: result.originalTokens - result.compressedTokens,
          savings_percent: result.originalTokens > 0
            ? Math.round(((result.originalTokens - result.compressedTokens) / result.originalTokens) * 100)
            : 0,
          // v3.1.0: new backward-compatible fields
          heuristics_applied: result.heuristics_applied,
          mode: result.mode,
        });
      } catch (err) {
        log.error(requestId, 'compress_context failed:', err instanceof Error ? err.message : String(err));
        return errorResponse({
          request_id: requestId,
          error: 'internal_error',
          message: `compress_context failed: ${err instanceof Error ? err.message : 'unknown error'}`,
        });
      }
    },
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // Tool 12: classify_task (FREE — G6: no metering)
  // ══════════════════════════════════════════════════════════════════════════════

  server.tool(
    'classify_task',
    'Classify a prompt by task type, reasoning complexity, risk level, and suggested profile. Free — no metering.',
    {
      prompt: z.string().min(1).max(102400).describe('The prompt to classify'),
      context: z.string().max(102400).optional().describe('Optional context: repo info, file contents, preferences'),
    },
    async ({ prompt, context }) => {
      const ctx = await buildCtx(storage, rateLimiter);
      const { requestId } = ctx;

      try {
        prompt = hardenInput(prompt);
        if (context) context = hardenInput(context);

        // Task type detection
        const taskType = detectTaskType(prompt);

        // Complexity classification
        const complexityResult = classifyComplexity(prompt, context);

        // Risk scoring (custom rules: enterprise only — v4.0.0)
        const ruleResults = runRules(prompt, context, taskType);
        const { riskScore } = ctx.tier === 'enterprise'
          ? await computeRiskScoreWithCustomRules(ruleResults, prompt, taskType)
          : { riskScore: computeRiskScore(ruleResults) };

        // Suggested profile (G5: deterministic mapping)
        const suggestedProfileName = suggestProfile(complexityResult.complexity, riskScore.score);

        // Decomposition hint for multi-step tasks
        let decompositionHint: string | undefined;
        if (complexityResult.complexity === 'multi_step') {
          const stepCount = complexityResult.signals
            .find(s => s.startsWith('multi_part='))
            ?.split('=')[1];
          if (stepCount && parseInt(stepCount, 10) >= 3) {
            decompositionHint = `This looks like a multi-step task with ${stepCount} parts. Consider breaking into ${stepCount} sub-prompts for better results.`;
          }
        }

        log.info(requestId, `classify_task: type=${taskType}, complexity=${complexityResult.complexity}, risk=${riskScore.level}`);
        return jsonResponse({
          request_id: requestId,
          schema_version: 1,
          taskType,
          complexity: complexityResult.complexity,
          complexityConfidence: complexityResult.confidence,
          suggestedProfile: suggestedProfileName,
          riskLevel: riskScore.level,
          riskScore: riskScore.score,
          riskDimensions: riskScore.dimensions,
          signals: complexityResult.signals,
          ...(decompositionHint && { decompositionHint }),
        });
      } catch (err) {
        log.error(requestId, 'classify_task failed:', err instanceof Error ? err.message : String(err));
        return errorResponse({
          request_id: requestId,
          error: 'internal_error',
          message: `classify_task failed: ${err instanceof Error ? err.message : 'unknown error'}`,
        });
      }
    },
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // Tool 13: route_model (FREE — G6: no metering)
  // ══════════════════════════════════════════════════════════════════════════════

  server.tool(
    'route_model',
    'Route to the optimal model based on task complexity, risk, budget, and latency preferences. Returns recommendation with decision_path audit trail. Free — no metering.',
    {
      prompt: z.string().min(1).max(102400).optional().describe('Raw prompt text (for auto-classification and research intent detection)'),
      context: z.string().max(102400).optional().describe('Optional context'),
      // Structured input (overrides auto-classification when provided)
      taskType: z.enum([
        'code_change', 'question', 'review', 'debug', 'create', 'refactor',
        'writing', 'research', 'planning', 'analysis', 'communication', 'data', 'other',
      ]).optional().describe('Task type (auto-detected if prompt provided)'),
      complexity: z.enum([
        'simple_factual', 'analytical', 'multi_step', 'creative', 'long_context', 'agent_orchestration',
      ]).optional().describe('Reasoning complexity (auto-detected if prompt provided)'),
      profile: z.enum([
        'cost_minimizer', 'balanced', 'quality_first', 'creative', 'enterprise_safe',
      ]).optional().describe('Optimization profile'),
      budgetSensitivity: z.enum(['low', 'medium', 'high']).optional().describe('Budget sensitivity (default: from profile)'),
      latencySensitivity: z.enum(['low', 'medium', 'high']).optional().describe('Latency sensitivity (default: from profile)'),
      target: z.enum(['claude', 'openai', 'google', 'perplexity', 'generic']).default('claude').describe('Output/provider target for provider preference'),
    },
    async ({ prompt, context, taskType, complexity, profile, budgetSensitivity, latencySensitivity, target }) => {
      const ctx = await buildCtx(storage, rateLimiter);
      const { requestId } = ctx;

      try {
        if (prompt) prompt = hardenInput(prompt);
        if (context) context = hardenInput(context);

        const outputTarget: OutputTarget = target || ctx.config.default_target;

        // Auto-classify if prompt provided and fields not explicitly given
        let resolvedTaskType = taskType;
        let resolvedComplexity = complexity;
        let complexityConfidence = 60;

        if (prompt) {
          if (!resolvedTaskType) {
            resolvedTaskType = detectTaskType(prompt);
          }
          if (!resolvedComplexity) {
            const cr = classifyComplexity(prompt, context);
            resolvedComplexity = cr.complexity;
            complexityConfidence = cr.confidence;
          }
        }

        // Defaults
        if (!resolvedTaskType) resolvedTaskType = 'other';
        if (!resolvedComplexity) resolvedComplexity = 'analytical';

        // Risk scoring (custom rules: enterprise only — v4.0.0)
        const contextTokens = estimateTokens((prompt || '') + (context || ''));
        const ruleResults = prompt ? runRules(prompt, context, resolvedTaskType) : [];
        const { riskScore: riskScoreResult } = ctx.tier === 'enterprise'
          ? await computeRiskScoreWithCustomRules(ruleResults, prompt || '', resolvedTaskType)
          : { riskScore: computeRiskScore(ruleResults) };

        // Build routing input
        const routingInput: ModelRoutingInput = {
          taskType: resolvedTaskType,
          complexity: resolvedComplexity,
          budgetSensitivity: budgetSensitivity || 'medium',
          latencySensitivity: latencySensitivity || 'medium',
          contextTokens,
          riskScore: riskScoreResult.score,
          profile: profile as OptimizationProfile | undefined,
        };

        const recommendation = routeModel(routingInput, prompt, complexityConfidence, outputTarget);

        log.info(requestId, `route_model: ${resolvedComplexity} → ${recommendation.primary.provider}/${recommendation.primary.model}`);
        return jsonResponse({
          request_id: requestId,
          schema_version: 1,
          ...recommendation,
        });
      } catch (err) {
        log.error(requestId, 'route_model failed:', err instanceof Error ? err.message : String(err));
        return errorResponse({
          request_id: requestId,
          error: 'internal_error',
          message: `route_model failed: ${err instanceof Error ? err.message : 'unknown error'}`,
        });
      }
    },
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // Tool 9: prompt_stats (FREE)
  // ══════════════════════════════════════════════════════════════════════════════

  server.tool(
    'prompt_stats',
    'Get aggregated optimization statistics: total count, average score, top task types, estimated savings.',
    {
      period: z.enum(['7d', '30d', 'lifetime']).default('lifetime').describe('Stats period (Phase A: lifetime only)'),
    },
    async ({ period }) => {
      const ctx = await buildCtx(storage, rateLimiter);
      const { requestId } = ctx;

      try {
        const stats = await storage.getStats();
        const usage = await storage.getUsage();

        // Deterministic ordering (I1)
        const topTaskTypes = sortCountsDescKeyAsc(stats.task_type_counts, 5);
        const topBlockingQuestions = sortCountsDescKeyAsc(stats.blocking_question_counts, 5);

        const avgScore = stats.total_optimized > 0
          ? Math.round(stats.score_sum_before / stats.total_optimized)
          : 0;

        log.info(requestId, `prompt_stats: total=${stats.total_optimized}, period=${period}`);
        return jsonResponse({
          request_id: requestId,
          total_optimized: stats.total_optimized,
          total_approved: stats.total_approved,
          avg_quality_score_before: avgScore,
          top_task_types: topTaskTypes,
          top_blocking_questions: topBlockingQuestions,
          estimated_cost_savings_usd: Math.round(stats.estimated_cost_savings_usd * 100) / 100,
          scoring_version: stats.scoring_version,
          tier: usage.tier,
          member_since: usage.first_used_at,
        });
      } catch (err) {
        log.error(requestId, 'prompt_stats failed:', err instanceof Error ? err.message : String(err));
        return errorResponse({
          request_id: requestId,
          error: 'internal_error',
          message: `prompt_stats failed: ${err instanceof Error ? err.message : 'unknown error'}`,
        });
      }
    },
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // Tool 15: prune_tools (FREE) — v3.1
  // ══════════════════════════════════════════════════════════════════════════════

  server.tool(
    'prune_tools',
    'Score and rank MCP tools by relevance to a task intent. Optionally prune low-relevance tools to save context tokens.',
    {
      intent: z.string().min(1).max(102400).describe('The task description or user intent to score tools against'),
      tools: z.array(z.object({
        name: z.string().min(1).describe('Tool name'),
        description: z.string().describe('Tool description'),
      })).min(1).max(500).describe('Array of tool definitions to score'),
      mode: z.enum(['rank', 'prune']).default('rank').describe('rank: score and sort all tools. prune: also mark bottom-M tools for removal'),
      prune_count: z.number().int().min(1).max(100).optional().describe('Number of lowest-scoring tools to prune (only in prune mode, default 5)'),
    },
    async ({ intent, tools: toolDefs, mode, prune_count }) => {
      const ctx = await buildCtx(storage, rateLimiter);
      const { requestId } = ctx;

      try {
        intent = hardenInput(intent);
        const sanitizedTools: ToolDefinition[] = toolDefs.map(t => ({
          name: hardenInput(t.name),
          description: hardenInput(t.description),
        }));

        const intentSpec = analyzePrompt(intent);
        const scores = scoreAllTools(sanitizedTools, intentSpec);

        let result;
        if (mode === 'prune') {
          result = pruneTools(scores, intent, prune_count ?? 5);
        } else {
          const ranked = rankTools(scores);
          result = {
            tools: ranked,
            pruned_count: 0,
            pruned_tools: [] as string[],
            tokens_saved_estimate: 0,
            mode: 'rank' as const,
          };
        }

        log.info(requestId, `prune_tools: mode=${mode}, tools=${sanitizedTools.length}, pruned=${result.pruned_count}`);
        return jsonResponse({
          request_id: requestId,
          schema_version: 1,
          mode: result.mode,
          tools: result.tools.map(t => ({
            name: t.name,
            relevance_score: t.relevance_score,
            signals: t.signals,
            tokens_saved_estimate: t.tokens_saved_estimate,
          })),
          pruned_count: result.pruned_count,
          pruned_tools: result.pruned_tools,
          tokens_saved_estimate: result.tokens_saved_estimate,
          total_tools: sanitizedTools.length,
        });
      } catch (err) {
        log.error(requestId, 'prune_tools failed:', err instanceof Error ? err.message : String(err));
        return errorResponse({
          request_id: requestId,
          error: 'internal_error',
          message: `prune_tools failed: ${err instanceof Error ? err.message : 'unknown error'}`,
        });
      }
    },
  );
}
