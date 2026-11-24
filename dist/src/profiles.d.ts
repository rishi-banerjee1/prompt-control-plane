import type { OptimizationProfile, ReasoningComplexity, ModelTier } from './types.js';
export interface ProfileSpec {
    tier: ModelTier;
    temperature: number;
    maxTokensCap: number;
    budgetSensitivity: 'low' | 'medium' | 'high';
    latencySensitivity: 'low' | 'medium' | 'high';
}
export declare const PROFILES: Readonly<Record<OptimizationProfile, Readonly<ProfileSpec>>>;
/**
 * Suggest a profile based on complexity + risk score.
 * enterprise_safe is NEVER auto-suggested (user-selected only).
 * Returns 'balanced' as fallback for unknown complexity types.
 */
export declare function suggestProfile(complexity: ReasoningComplexity, riskScore: number): OptimizationProfile;
/**
 * Resolve a profile name, falling back to 'balanced' for invalid names.
 * Adds a decision_path entry when fallback is used.
 */
export declare function resolveProfile(profileName: string | undefined, decisionPath: string[]): OptimizationProfile;
