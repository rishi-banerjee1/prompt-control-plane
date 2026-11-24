import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createRequestId, log } from '../logger.js';
import type { StorageInterface, RateLimiter, ExecutionContext, SerializedTierLimits } from '../types.js';
import { PLAN_LIMITS } from '../types.js';
import { STRICTNESS_THRESHOLDS } from '../policy.js';
export { z };
export type { McpServer };
export { createRequestId, log };
export { PLAN_LIMITS };
export { STRICTNESS_THRESHOLDS };
export type { StorageInterface, RateLimiter, ExecutionContext, SerializedTierLimits, };
export declare function hardenInput(input: string): string;
export declare function jsonResponse(data: unknown): {
    content: {
        type: "text";
        text: string;
    }[];
};
export declare function errorResponse(data: {
    request_id: string;
    error: string;
    message: string;
    [key: string]: unknown;
}): {
    content: {
        type: "text";
        text: string;
    }[];
    isError: boolean;
};
export declare function sanitizeLimits(limits: typeof PLAN_LIMITS.free): SerializedTierLimits;
export declare const PRO_PURCHASE_URL = "";
export declare const POWER_PURCHASE_URL = "";
export declare const ENTERPRISE_PURCHASE_URL = "https://getpcp.site/contact";
/** Build an ExecutionContext for the current request. */
export declare function buildCtx(storage: StorageInterface, rateLimiter: RateLimiter): Promise<ExecutionContext>;
