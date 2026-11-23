// tools/helpers.ts — Shared helpers for all tool modules.
// Input hardening, response builders, sanitization, purchase URLs, strictness map.

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createRequestId, log } from '../logger.js';
import type {
  StorageInterface, RateLimiter, ExecutionContext, SerializedTierLimits,
} from '../types.js';
import { PLAN_LIMITS } from '../types.js';
import { STRICTNESS_THRESHOLDS } from '../policy.js';

// ─── Re-exports for tool modules ────────────────────────────────────────────
export { z };
export type { McpServer };
export { createRequestId, log };
export { PLAN_LIMITS };
export { STRICTNESS_THRESHOLDS };
export type {
  StorageInterface, RateLimiter, ExecutionContext, SerializedTierLimits,
};

// ─── Input Hardening ─────────────────────────────────────────────────────────

export function hardenInput(input: string): string {
  return input
    .replace(/\0/g, '')                                    // null byte removal
    .replace(/\s{50,}/g, match => match.slice(0, 50));     // whitespace cap
}

// ─── Response Helpers ────────────────────────────────────────────────────────

export function jsonResponse(data: unknown) {
  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify(data, null, 2),
    }],
  };
}

export function errorResponse(data: { request_id: string; error: string; message: string; [key: string]: unknown }) {
  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify(data, null, 2),
    }],
    isError: true,
  };
}

// ─── Sanitization Helpers ────────────────────────────────────────────────────
// Guardrail: Infinity never serialized (convert to null for JSON safety)

export function sanitizeLimits(limits: typeof PLAN_LIMITS.free): SerializedTierLimits {
  return {
    lifetime: limits.lifetime === Infinity ? null : limits.lifetime,
    monthly: limits.monthly === Infinity ? null : limits.monthly,
    rate_per_minute: limits.rate_per_minute,
    always_on: limits.always_on,
  };
}

// ─── Purchase URLs (Razorpay checkout) ───────────────────────────────────────

export const PRO_PURCHASE_URL = ''; // Legacy API export; individual paid tiers were removed.
export const POWER_PURCHASE_URL = ''; // Legacy API export; individual paid tiers were removed.
export const ENTERPRISE_PURCHASE_URL = 'https://getpcp.site/contact';

// ─── BuildCtx factory ────────────────────────────────────────────────────────

/** Build an ExecutionContext for the current request. */
export async function buildCtx(
  storage: StorageInterface,
  rateLimiter: RateLimiter,
): Promise<ExecutionContext> {
  const requestId = createRequestId();
  const config = await storage.getConfig();
  const usage = await storage.getUsage();
  return {
    requestId,
    storage,
    logger: log,
    config,
    rateLimiter,
    tier: usage.tier,
  };
}
