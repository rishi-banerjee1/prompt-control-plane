// tools/helpers.ts — Shared helpers for all tool modules.
// Input hardening, response builders, sanitization, purchase URLs, strictness map.
import { z } from 'zod';
import { createRequestId, log } from '../logger.js';
import { PLAN_LIMITS } from '../types.js';
import { STRICTNESS_THRESHOLDS } from '../policy.js';
// ─── Re-exports for tool modules ────────────────────────────────────────────
export { z };
export { createRequestId, log };
export { PLAN_LIMITS };
export { STRICTNESS_THRESHOLDS };
// ─── Input Hardening ─────────────────────────────────────────────────────────
export function hardenInput(input) {
    return input
        .replace(/\0/g, '') // null byte removal
        .replace(/\s{50,}/g, match => match.slice(0, 50)); // whitespace cap
}
// ─── Response Helpers ────────────────────────────────────────────────────────
export function jsonResponse(data) {
    return {
        content: [{
                type: 'text',
                text: JSON.stringify(data, null, 2),
            }],
    };
}
export function errorResponse(data) {
    return {
        content: [{
                type: 'text',
                text: JSON.stringify(data, null, 2),
            }],
        isError: true,
    };
}
// ─── Sanitization Helpers ────────────────────────────────────────────────────
// Guardrail: Infinity never serialized (convert to null for JSON safety)
export function sanitizeLimits(limits) {
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
export async function buildCtx(storage, rateLimiter) {
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
//# sourceMappingURL=helpers.js.map