import type { RateLimiter } from './types.js';
export declare class LocalRateLimiter implements RateLimiter {
    private timestampsByTier;
    check(tier: string): {
        allowed: boolean;
        retry_after_seconds?: number;
    };
}
