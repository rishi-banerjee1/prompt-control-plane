// tools/admin.ts — Configuration/governance tools:
// configure_optimizer (FREE), get_usage (FREE), set_license (FREE),
// license_status (FREE), save_custom_rules (FREE, tier-gated).

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { validateLicenseKey } from '../license.js';
import type {
  StorageInterface, RateLimiter,
  OptimizerConfig, LicenseData,
} from '../types.js';
import { PLAN_LIMITS } from '../types.js';
import {
  jsonResponse, errorResponse, buildCtx, log, sanitizeLimits,
  PRO_PURCHASE_URL, POWER_PURCHASE_URL, ENTERPRISE_PURCHASE_URL,
} from './helpers.js';

export function registerAdminTools(
  server: McpServer,
  storage: StorageInterface,
  rateLimiter: RateLimiter,
  engineVersion?: string,
): void {

  // ══════════════════════════════════════════════════════════════════════════════
  // Tool 7: configure_optimizer (FREE)
  // ══════════════════════════════════════════════════════════════════════════════

  server.tool(
    'configure_optimizer',
    'Configure optimizer behavior: mode, threshold, strictness, default target, ephemeral mode, session limits. Supports config locking with passphrase protection.',
    {
      mode: z.enum(['manual', 'always_on']).optional().describe('Optimization mode'),
      threshold: z.number().min(0).max(100).optional().describe('Quality threshold (0-100)'),
      strictness: z.enum(['relaxed', 'standard', 'strict']).optional().describe('Strictness level'),
      auto_compile: z.boolean().optional().describe('Auto-compile prompts'),
      default_target: z.enum(['claude', 'openai', 'google', 'perplexity', 'generic']).optional().describe('Default output/provider target'),
      ephemeral_mode: z.boolean().optional().describe('Ephemeral mode: sessions in-memory only'),
      max_sessions: z.number().min(1).max(10000).optional().describe('Max session count'),
      max_session_size_kb: z.number().min(1).max(1024).optional().describe('Max session size in KB'),
      max_session_dir_mb: z.number().min(1).max(100).optional().describe('Max session directory size in MB'),
      // v3.3.0: Enterprise Operations
      session_retention_days: z.number().int().min(1).max(365).optional().describe('Auto-purge sessions older than N days (undefined = no auto-purge)'),
      policy_mode: z.enum(['advisory', 'enforce']).optional().describe('Policy enforcement mode (default: advisory)'),
      audit_log: z.boolean().optional().describe('Enable append-only JSONL audit trail (default: false)'),
      // Config lock mode
      lock: z.boolean().optional().describe('Lock config — prevents changes until unlocked with the same secret'),
      unlock: z.boolean().optional().describe('Unlock config — requires the same secret used to lock'),
      lock_secret: z.string().min(4).max(128).optional().describe('Passphrase to lock/unlock config (min 4 chars). Stored as SHA-256 hash only.'),
    },
    async (params) => {
      const ctx = await buildCtx(storage, rateLimiter);
      const { requestId } = ctx;

      try {
        const { createHash } = await import('node:crypto');

        // ─── Enterprise tier gates (v4.0.0) ──────────────────────────────
        if ((params.lock || params.unlock) && ctx.tier !== 'enterprise') {
          return errorResponse({
            request_id: requestId,
            error: 'tier_feature_unavailable',
            message: 'Config lock/unlock requires Enterprise tier.',
            current_tier: ctx.tier,
            enterprise_purchase_url: ENTERPRISE_PURCHASE_URL,
          });
        }

        // ─── Lock/Unlock handling ────────────────────────────────────────
        if (params.lock) {
          if (!params.lock_secret) {
            return errorResponse({
              request_id: requestId,
              error: 'lock_secret_required',
              message: 'lock_secret is required when locking config. Provide a passphrase (min 4 chars).',
            });
          }
          const secretHash = createHash('sha256').update(params.lock_secret, 'utf8').digest('hex');
          const config = await storage.setConfig({ locked_config: true, lock_secret_hash: secretHash });

          // Audit the lock
          if (config.audit_log) {
            const { auditLogger } = await import('../auditLog.js');
            await auditLogger.append({
              timestamp: new Date().toISOString(),
              event: 'configure',
              request_id: requestId,
              policy_mode: config.policy_mode || 'advisory',
              outcome: 'success',
              details: { action: 'lock' },
            });
          }

          log.info(requestId, 'configure_optimizer: config locked');
          return jsonResponse({
            request_id: requestId,
            locked: true,
            message: 'Config is now locked. Use unlock: true with the same lock_secret to unlock.',
          });
        }

        if (params.unlock) {
          if (!params.lock_secret) {
            return errorResponse({
              request_id: requestId,
              error: 'lock_secret_required',
              message: 'lock_secret is required when unlocking config.',
            });
          }
          if (!ctx.config.lock_secret_hash) {
            return errorResponse({
              request_id: requestId,
              error: 'not_locked',
              message: 'Config is not locked.',
            });
          }
          const secretHash = createHash('sha256').update(params.lock_secret, 'utf8').digest('hex');
          if (secretHash !== ctx.config.lock_secret_hash) {
            // Audit the failed unlock attempt
            if (ctx.config.audit_log) {
              const { auditLogger } = await import('../auditLog.js');
              await auditLogger.append({
                timestamp: new Date().toISOString(),
                event: 'configure',
                request_id: requestId,
                policy_mode: ctx.config.policy_mode || 'advisory',
                outcome: 'blocked',
                details: { action: 'unlock', reason: 'wrong_secret' },
              });
            }
            return errorResponse({
              request_id: requestId,
              error: 'invalid_lock_secret',
              message: 'Wrong lock_secret. Unlock attempt logged.',
            });
          }
          const config = await storage.setConfig({ locked_config: false, lock_secret_hash: undefined });

          // Audit the unlock
          if (config.audit_log || ctx.config.audit_log) {
            const { auditLogger } = await import('../auditLog.js');
            await auditLogger.append({
              timestamp: new Date().toISOString(),
              event: 'configure',
              request_id: requestId,
              policy_mode: config.policy_mode || 'advisory',
              outcome: 'success',
              details: { action: 'unlock' },
            });
          }

          log.info(requestId, 'configure_optimizer: config unlocked');
          return jsonResponse({
            request_id: requestId,
            locked: false,
            message: 'Config is now unlocked.',
          });
        }

        // ─── Config locked gate ──────────────────────────────────────────
        if (ctx.config.locked_config) {
          // Audit the blocked attempt
          if (ctx.config.audit_log) {
            const { auditLogger } = await import('../auditLog.js');
            await auditLogger.append({
              timestamp: new Date().toISOString(),
              event: 'configure',
              request_id: requestId,
              policy_mode: ctx.config.policy_mode || 'advisory',
              outcome: 'blocked',
              details: { reason: 'config_locked' },
            });
          }

          return errorResponse({
            request_id: requestId,
            error: 'config_locked',
            message: 'Config is locked. Use unlock: true with the correct lock_secret to make changes.',
          });
        }

        // ─── Normal config changes ───────────────────────────────────────

        // always_on tier check
        if (params.mode === 'always_on' && !PLAN_LIMITS[ctx.tier]?.always_on) {
          return errorResponse({
            request_id: requestId,
            error: 'tier_feature_unavailable',
            message: 'always_on mode requires Pro tier.',
            upgrade_hint: true,
          });
        }

        // Enterprise-only settings (v4.0.0)
        const ENTERPRISE_ONLY_SETTINGS = ['policy_mode', 'audit_log', 'session_retention_days'] as const;
        for (const setting of ENTERPRISE_ONLY_SETTINGS) {
          if (params[setting] !== undefined && ctx.tier !== 'enterprise') {
            return errorResponse({
              request_id: requestId,
              error: 'tier_feature_unavailable',
              message: `${setting} requires Enterprise tier.`,
              current_tier: ctx.tier,
              enterprise_purchase_url: ENTERPRISE_PURCHASE_URL,
            });
          }
        }

        // Build partial config from provided params
        const updates: Partial<OptimizerConfig> = {};
        const appliedChanges: string[] = [];

        if (params.mode !== undefined) { updates.mode = params.mode; appliedChanges.push(`mode → ${params.mode}`); }
        if (params.threshold !== undefined) { updates.threshold = params.threshold; appliedChanges.push(`threshold → ${params.threshold}`); }
        if (params.strictness !== undefined) { updates.strictness = params.strictness; appliedChanges.push(`strictness → ${params.strictness}`); }
        if (params.auto_compile !== undefined) { updates.auto_compile = params.auto_compile; appliedChanges.push(`auto_compile → ${params.auto_compile}`); }
        if (params.default_target !== undefined) { updates.default_target = params.default_target; appliedChanges.push(`default_target → ${params.default_target}`); }
        if (params.ephemeral_mode !== undefined) { updates.ephemeral_mode = params.ephemeral_mode; appliedChanges.push(`ephemeral_mode → ${params.ephemeral_mode}`); }
        if (params.max_sessions !== undefined) { updates.max_sessions = params.max_sessions; appliedChanges.push(`max_sessions → ${params.max_sessions}`); }
        if (params.max_session_size_kb !== undefined) { updates.max_session_size_kb = params.max_session_size_kb; appliedChanges.push(`max_session_size_kb → ${params.max_session_size_kb}`); }
        if (params.max_session_dir_mb !== undefined) { updates.max_session_dir_mb = params.max_session_dir_mb; appliedChanges.push(`max_session_dir_mb → ${params.max_session_dir_mb}`); }
        // v3.3.0: Enterprise Operations
        if (params.session_retention_days !== undefined) { updates.session_retention_days = params.session_retention_days; appliedChanges.push(`session_retention_days → ${params.session_retention_days}`); }
        if (params.policy_mode !== undefined) { updates.policy_mode = params.policy_mode; appliedChanges.push(`policy_mode → ${params.policy_mode}`); }
        if (params.audit_log !== undefined) { updates.audit_log = params.audit_log; appliedChanges.push(`audit_log → ${params.audit_log}`); }

        const config = await storage.setConfig(updates);

        // Audit configure event (v3.3.0)
        if (config.audit_log) {
          const { auditLogger } = await import('../auditLog.js');
          await auditLogger.append({
            timestamp: new Date().toISOString(),
            event: 'configure',
            request_id: requestId,
            policy_mode: config.policy_mode || 'advisory',
            outcome: 'success',
            details: { changes: appliedChanges.join('; ') },
          });
        }

        log.info(requestId, `configure_optimizer: ${appliedChanges.join(', ')}`);
        return jsonResponse({
          request_id: requestId,
          config,
          applied_changes: appliedChanges,
        });
      } catch (err) {
        log.error(requestId, 'configure_optimizer failed:', err instanceof Error ? err.message : String(err));
        return errorResponse({
          request_id: requestId,
          error: 'internal_error',
          message: `configure_optimizer failed: ${err instanceof Error ? err.message : 'unknown error'}`,
        });
      }
    },
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // Tool 8: get_usage (FREE)
  // ══════════════════════════════════════════════════════════════════════════════

  server.tool(
    'get_usage',
    'Get current usage count, limits, remaining quota, and tier information.',
    {},
    async () => {
      const ctx = await buildCtx(storage, rateLimiter);
      const { requestId } = ctx;

      try {
        const usage = await storage.getUsage();
        const limits = PLAN_LIMITS[usage.tier] || PLAN_LIMITS.free;
        const remaining = {
          lifetime: Math.max(0, limits.lifetime - usage.total_optimizations),
          monthly: Math.max(0, limits.monthly - usage.total_optimizations), // Phase A: same as lifetime
        };

        log.info(requestId, `get_usage: total=${usage.total_optimizations}, tier=${usage.tier}`);
        return jsonResponse({
          request_id: requestId,
          total_optimizations: usage.total_optimizations,
          limits,
          remaining,
          tier: usage.tier,
          enforcement: null,
          first_used_at: usage.first_used_at,
          last_used_at: usage.last_used_at,
        });
      } catch (err) {
        log.error(requestId, 'get_usage failed:', err instanceof Error ? err.message : String(err));
        return errorResponse({
          request_id: requestId,
          error: 'internal_error',
          message: `get_usage failed: ${err instanceof Error ? err.message : 'unknown error'}`,
        });
      }
    },
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // Tool 10: set_license (FREE)
  // ══════════════════════════════════════════════════════════════════════════════

  server.tool(
    'set_license',
    'Activate a Pro or Power license key. Validates the Ed25519 signature offline and unlocks the corresponding tier.',
    {
      license_key: z.string().min(10).max(2048).describe('License key string (starts with pcp_)'),
    },
    async ({ license_key }) => {
      const ctx = await buildCtx(storage, rateLimiter);
      const { requestId } = ctx;

      try {
        const result = validateLicenseKey(license_key);

        if (!result.valid) {
          log.warn(requestId, `set_license: validation failed — ${result.error}`);
          return errorResponse({
            request_id: requestId,
            error: 'invalid_license',
            message: result.error === 'expired'
              ? 'License key has expired. Please renew your subscription.'
              : `License key is invalid: ${result.error}`,
            pro_purchase_url: PRO_PURCHASE_URL,
            power_purchase_url: POWER_PURCHASE_URL,
            enterprise_purchase_url: ENTERPRISE_PURCHASE_URL,
          });
        }

        const now = new Date().toISOString();
        const licenseData: LicenseData = {
          schema_version: 1,
          tier: result.payload.tier,
          issued_at: result.payload.issued_at,
          expires_at: result.payload.expires_at,
          license_id: result.payload.license_id,
          activated_at: now,
          valid: true,
        };

        await storage.setLicense(licenseData);

        // Audit license activation (v3.3.0)
        if (ctx.config.audit_log) {
          const { auditLogger } = await import('../auditLog.js');
          await auditLogger.append({
            timestamp: new Date().toISOString(),
            event: 'license_activate',
            request_id: requestId,
            policy_mode: ctx.config.policy_mode || 'advisory',
            outcome: 'success',
            details: { tier: result.payload.tier, license_id: result.payload.license_id },
          });
        }

        log.info(requestId, `set_license: activated tier=${result.payload.tier}, license_id=${result.payload.license_id}`);
        return jsonResponse({
          request_id: requestId,
          status: 'activated',
          tier: result.payload.tier,
          expires_at: result.payload.expires_at,
          license_id: result.payload.license_id,
          limits: sanitizeLimits(PLAN_LIMITS[result.payload.tier] || PLAN_LIMITS.free),
        });
      } catch (err) {
        log.error(requestId, 'set_license failed:', err instanceof Error ? err.message : String(err));
        return errorResponse({
          request_id: requestId,
          error: 'internal_error',
          message: `set_license failed: ${err instanceof Error ? err.message : 'unknown error'}`,
        });
      }
    },
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // Tool 11: license_status (FREE)
  // ══════════════════════════════════════════════════════════════════════════════

  server.tool(
    'license_status',
    'Check current license status, tier, and expiry. Returns purchase link if no license is active.',
    {},
    async () => {
      const ctx = await buildCtx(storage, rateLimiter);
      const { requestId } = ctx;

      try {
        const license = await storage.getLicense();

        if (!license) {
          log.info(requestId, 'license_status: no license');
          return jsonResponse({
            request_id: requestId,
            has_license: false,
            tier: 'free',
            limits: sanitizeLimits(PLAN_LIMITS.free),
            pro_purchase_url: PRO_PURCHASE_URL,
            power_purchase_url: POWER_PURCHASE_URL,
            enterprise_purchase_url: ENTERPRISE_PURCHASE_URL,
          });
        }

        const limits = PLAN_LIMITS[license.tier] || PLAN_LIMITS.free;

        log.info(requestId, `license_status: tier=${license.tier}, valid=${license.valid}, id=${license.license_id}`);
        return jsonResponse({
          request_id: requestId,
          has_license: true,
          valid: license.valid,
          tier: license.tier,
          license_id: license.license_id,
          expires_at: license.expires_at,
          activated_at: license.activated_at,
          limits,
          ...(license.validation_error && { validation_error: license.validation_error }),
          ...(!license.valid && { pro_purchase_url: PRO_PURCHASE_URL, power_purchase_url: POWER_PURCHASE_URL, enterprise_purchase_url: ENTERPRISE_PURCHASE_URL }),
        });
      } catch (err) {
        log.error(requestId, 'license_status failed:', err instanceof Error ? err.message : String(err));
        return errorResponse({
          request_id: requestId,
          error: 'internal_error',
          message: `license_status failed: ${err instanceof Error ? err.message : 'unknown error'}`,
        });
      }
    },
  );

  // ─── Tool 20: save_custom_rules (FREE but tier-gated, v4.1) ────────────

  server.tool(
    'save_custom_rules',
    'Save custom governance rules to the local rules file (~/.prompt-control-plane/custom-rules.json). Validates all rules against the product schema, writes to disk, and returns the rule-set hash. Rules take effect on the next optimization. Works with any LLM connected to PCP. Enterprise tier only.',
    {
      rules: z.array(z.object({
        id: z.string().min(1).max(64).describe('Snake_case rule ID — must start with lowercase letter (a-z), then a-z0-9_ chars'),
        description: z.string().min(1).max(200).describe('Human-readable rule description (max 200 chars)'),
        pattern: z.string().min(1).max(500).describe('Regex pattern to match against prompt text (required)'),
        negative_pattern: z.string().max(500).optional().describe('Regex — if prompt matches this, rule does NOT fire'),
        applies_to: z.enum(['code', 'prose', 'all']).describe('Which prompt types this rule applies to'),
        severity: z.enum(['BLOCKING', 'NON-BLOCKING']).describe('BLOCKING rules can gate optimization in enforce mode'),
        risk_dimension: z.enum(['hallucination', 'constraint', 'underspec', 'scope']).describe('Which risk dimension this rule affects'),
        risk_weight: z.number().int().min(1).max(25).describe('How much this rule contributes to risk score (1-25)'),
      })).min(1).max(25).describe('Array of custom governance rules (1-25). Build these in the Enterprise Console or craft by hand.'),
    },
    async ({ rules }) => {
      const ctx = await buildCtx(storage, rateLimiter);
      const { requestId } = ctx;

      try {
        // Enterprise-only gate: custom rules are an enterprise governance feature
        if (ctx.tier !== 'enterprise') {
          return errorResponse({
            request_id: requestId,
            error: 'enterprise_required',
            message: `Custom governance rules are an Enterprise-only feature. Current tier: ${ctx.tier}`,
            current_tier: ctx.tier,
            required_tier: 'enterprise',
            enterprise_purchase_url: ENTERPRISE_PURCHASE_URL,
            next_step: 'Contact us for an Enterprise license to unlock custom governance rules.',
          });
        }

        const { customRules } = await import('../customRules.js');
        const result = await customRules.saveRules(rules);

        // Audit log if enabled (v3.3.0 pattern)
        if (ctx.config.audit_log) {
          const { auditLogger } = await import('../auditLog.js');
          await auditLogger.append({
            timestamp: new Date().toISOString(),
            event: 'save_custom_rules',
            request_id: requestId,
            policy_mode: ctx.config.policy_mode || 'advisory',
            outcome: 'success',
            details: {
              saved_count: result.saved_count,
              rule_set_hash: result.rule_set_hash,
            },
          });
        }

        log.info(requestId, `save_custom_rules: saved ${result.saved_count} rules`);
        return jsonResponse({
          request_id: requestId,
          schema_version: 1,
          ...result,
          message: `${result.saved_count} custom rule(s) saved successfully. They will take effect on the next optimization.`,
        });
      } catch (err) {
        // Audit failed save attempt
        if (ctx.config.audit_log) {
          try {
            const { auditLogger } = await import('../auditLog.js');
            await auditLogger.append({
              timestamp: new Date().toISOString(),
              event: 'save_custom_rules',
              request_id: requestId,
              policy_mode: ctx.config.policy_mode || 'advisory',
              outcome: 'error',
              details: { error: err instanceof Error ? err.message : String(err) },
            });
          } catch { /* no-throw audit invariant */ }
        }

        log.error(requestId, 'save_custom_rules failed:', err instanceof Error ? err.message : String(err));
        return errorResponse({
          request_id: requestId,
          error: 'save_custom_rules_failed',
          message: err instanceof Error ? err.message : 'unknown error',
        });
      }
    },
  );
}
