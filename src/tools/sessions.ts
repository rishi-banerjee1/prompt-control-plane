// tools/sessions.ts — Session management tools:
// list_sessions (FREE), export_session (FREE), delete_session (FREE), purge_sessions (FREE).

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { StorageInterface, RateLimiter } from '../types.js';
import {
  hardenInput, jsonResponse, errorResponse, buildCtx, log,
} from './helpers.js';

export function registerSessionTools(
  server: McpServer,
  storage: StorageInterface,
  rateLimiter: RateLimiter,
  engineVersion?: string,
): void {

  // ─── Tool 16: list_sessions (v3.2.1) ───────────────────────────────────

  server.tool(
    'list_sessions',
    'List all optimization sessions with metadata (no raw prompts). Free tool, not metered.',
    {
      createdAfter: z.number().optional().describe('Only sessions created after this Unix timestamp'),
      createdBefore: z.number().optional().describe('Only sessions created before this Unix timestamp'),
      limit: z.number().int().min(1).max(100).default(100).describe('Maximum number of sessions to return (default: 100, max: 100)'),
    },
    async ({ createdAfter, createdBefore, limit }) => {
      const ctx = await buildCtx(storage, rateLimiter);
      const { requestId } = ctx;

      try {
        const { sessionHistory } = await import('../sessionHistory.js');
        const list = await sessionHistory.listSessions({
          createdAfter,
          createdBefore,
          limit: Math.min(limit || 100, 100),
        });

        log.info(requestId, `list_sessions: returned ${list.sessions.length} of ${list.total_sessions} total`);
        return jsonResponse({
          request_id: requestId,
          schema_version: 1,
          sessions: list.sessions,
          total_sessions: list.total_sessions,
          storage_path: list.storage_path,
        });
      } catch (err) {
        log.error(requestId, 'list_sessions failed:', err instanceof Error ? err.message : String(err));
        return errorResponse({
          request_id: requestId,
          error: 'internal_error',
          message: `list_sessions failed: ${err instanceof Error ? err.message : 'unknown error'}`,
        });
      }
    },
  );

  // ─── Tool 17: export_session (v3.2.1) ──────────────────────────────────

  server.tool(
    'export_session',
    'Export full session details including raw prompt. Free tool, not metered.',
    {
      session_id: z.string().min(1).max(100).describe('Session ID to export'),
    },
    async ({ session_id }) => {
      const ctx = await buildCtx(storage, rateLimiter);
      const { requestId } = ctx;

      try {
        session_id = hardenInput(session_id);
        const { sessionHistory } = await import('../sessionHistory.js');

        // Calculate policy_hash for export (v3.3.0)
        let exportPolicyHash: string | undefined;
        if (ctx.config.policy_mode === 'enforce') {
          const { calculatePolicyHash } = await import('../policy.js');
          const { calculateBuiltInRuleSetHash } = await import('../rules.js');
          const { customRules: cr } = await import('../customRules.js');
          // We need taskType from the session — load it first
          const sessionForHash = await sessionHistory.loadSession(session_id);
          if (sessionForHash) {
            const customRulesList = await cr.getRulesForTask(sessionForHash.intent_spec.task_type);
            exportPolicyHash = calculatePolicyHash({
              builtInRuleSetHash: calculateBuiltInRuleSetHash(),
              customRuleSetHash: cr.calculateRuleSetHash(customRulesList),
              policyMode: ctx.config.policy_mode,
              strictness: ctx.config.strictness,
            });
          }
        }

        const exported = await sessionHistory.exportSession(session_id, {
          engine_version: engineVersion,
          policy_mode: ctx.config.policy_mode || 'advisory',
          policy_hash: exportPolicyHash,
        });
        if (!exported) {
          return errorResponse({
            request_id: requestId,
            error: 'not_found',
            message: `Session ${session_id} not found`,
          });
        }

        log.info(requestId, `export_session: exported ${session_id}`);
        return jsonResponse({
          request_id: requestId,
          ...exported,
        });
      } catch (err) {
        log.error(requestId, 'export_session failed:', err instanceof Error ? err.message : String(err));
        return errorResponse({
          request_id: requestId,
          error: 'internal_error',
          message: `export_session failed: ${err instanceof Error ? err.message : 'unknown error'}`,
        });
      }
    },
  );

  // ─── Tool 18: delete_session (FREE, v3.3.0) ──────────────────────────────

  server.tool(
    'delete_session',
    'Delete a single optimization session by ID. Returns deleted status. Free tool, not metered.',
    {
      session_id: z.string().min(1).max(100).describe('Session ID to delete'),
    },
    async ({ session_id }) => {
      const ctx = await buildCtx(storage, rateLimiter);
      const { requestId } = ctx;

      try {
        session_id = hardenInput(session_id);
        const { sessionHistory } = await import('../sessionHistory.js');

        const deleted = await sessionHistory.deleteSession(session_id);

        if (!deleted) {
          return errorResponse({
            request_id: requestId,
            error: 'not_found',
            message: `Session ${session_id} not found`,
            session_id,
          });
        }

        // Audit delete (v3.3.0)
        if (ctx.config.audit_log) {
          const { auditLogger } = await import('../auditLog.js');
          await auditLogger.append({
            timestamp: new Date().toISOString(),
            event: 'delete',
            session_id,
            request_id: requestId,
            policy_mode: ctx.config.policy_mode || 'advisory',
            outcome: 'success',
          });
        }

        log.info(requestId, `delete_session: deleted ${session_id}`);
        return jsonResponse({
          request_id: requestId,
          schema_version: 1,
          deleted: true,
          session_id,
        });
      } catch (err) {
        log.error(requestId, 'delete_session failed:', err instanceof Error ? err.message : String(err));
        return errorResponse({
          request_id: requestId,
          error: 'internal_error',
          message: `delete_session failed: ${err instanceof Error ? err.message : 'unknown error'}`,
        });
      }
    },
  );

  // ─── Tool 19: purge_sessions (FREE, v3.3.0) ──────────────────────────────

  server.tool(
    'purge_sessions',
    'Purge optimization sessions by age policy or delete all. Safe-by-default: requires explicit parameters. Free tool, not metered.',
    {
      older_than_days: z.number().int().min(1).max(365).optional().describe('Delete sessions older than N days'),
      keep_last: z.number().int().min(0).max(1000).optional().describe('Always protect the N newest sessions'),
      purge_all: z.boolean().optional().describe('Explicit opt-in to delete ALL sessions'),
      dry_run: z.boolean().default(false).describe('Preview what would be deleted without actually deleting'),
    },
    async ({ older_than_days, keep_last, purge_all, dry_run }) => {
      const ctx = await buildCtx(storage, rateLimiter);
      const { requestId } = ctx;

      try {
        const { sessionHistory } = await import('../sessionHistory.js');

        // Default resolution (safe-by-default)
        let result;
        let effectiveOlderThanDays = older_than_days;

        if (purge_all === true) {
          // Explicit delete-all
          result = await sessionHistory.purgeByPolicy({
            mode: 'all',
            keep_last,
            dry_run: dry_run ?? false,
          });
        } else if (older_than_days !== undefined) {
          // Filter by age
          result = await sessionHistory.purgeByPolicy({
            mode: 'by_policy',
            older_than_days,
            keep_last,
            dry_run: dry_run ?? false,
          });
        } else if (ctx.config.session_retention_days !== undefined) {
          // Use config default
          effectiveOlderThanDays = ctx.config.session_retention_days;
          result = await sessionHistory.purgeByPolicy({
            mode: 'by_policy',
            older_than_days: ctx.config.session_retention_days,
            keep_last,
            dry_run: dry_run ?? false,
          });
        } else {
          // No-op: nothing configured
          log.info(requestId, 'purge_sessions: no-op (no retention configured)');
          return jsonResponse({
            request_id: requestId,
            schema_version: 1,
            message: 'No retention configured; pass older_than_days or purge_all: true',
            deleted_count: 0,
            retained_count: 0,
            scanned_count: 0,
            deleted_session_ids: [],
            truncated: false,
            dry_run: dry_run ?? false,
            no_op: true,
            policy_mode: ctx.config.policy_mode || 'advisory',
          });
        }

        // Audit purge (v3.3.0 — even dry_run gets logged for audit trail)
        if (ctx.config.audit_log) {
          const { auditLogger } = await import('../auditLog.js');
          await auditLogger.append({
            timestamp: new Date().toISOString(),
            event: 'purge',
            request_id: requestId,
            policy_mode: ctx.config.policy_mode || 'advisory',
            outcome: 'success',
            details: {
              deleted_count: result.deleted_count,
              dry_run: result.dry_run,
              ...(purge_all && { purge_all: true }),
              ...(effectiveOlderThanDays !== undefined && { older_than_days: effectiveOlderThanDays }),
            },
          });
        }

        log.info(requestId, `purge_sessions: deleted=${result.deleted_count}, retained=${result.retained_count}, dry_run=${result.dry_run}`);
        return jsonResponse({
          request_id: requestId,
          schema_version: 1,
          deleted_count: result.deleted_count,
          retained_count: result.retained_count,
          scanned_count: result.scanned_count,
          deleted_session_ids: result.deleted_session_ids,
          truncated: result.truncated,
          dry_run: result.dry_run,
          no_op: result.no_op,
          ...(result.cutoff_date && { cutoff_date: result.cutoff_date }),
          ...(result.effective_older_than_days !== undefined && {
            effective_older_than_days: result.effective_older_than_days,
          }),
          policy_applied: {
            older_than_days: effectiveOlderThanDays ?? null,
            keep_last: keep_last ?? null,
            purge_all: purge_all ?? false,
          },
          policy_mode: ctx.config.policy_mode || 'advisory',
        });
      } catch (err) {
        log.error(requestId, 'purge_sessions failed:', err instanceof Error ? err.message : String(err));
        return errorResponse({
          request_id: requestId,
          error: 'internal_error',
          message: `purge_sessions failed: ${err instanceof Error ? err.message : 'unknown error'}`,
        });
      }
    },
  );
}
