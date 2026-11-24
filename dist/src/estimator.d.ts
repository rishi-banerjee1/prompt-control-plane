import type { CostEstimate, TaskType, RiskLevel, OutputTarget, ModelRoutingInput, ModelRecommendation, TierModelEntry, ModelTier } from './types.js';
export declare const PRICING_DATA: {
    readonly pricing_version: "2026-08";
    readonly last_updated: "2026-08-26";
    readonly providers: {
        readonly anthropic: {
            readonly 'claude-haiku-4-5': {
                readonly in: 1;
                readonly out: 5;
            };
            readonly 'claude-sonnet-5': {
                readonly in: 2;
                readonly out: 10;
            };
            readonly 'claude-opus-5': {
                readonly in: 5;
                readonly out: 25;
            };
            readonly 'claude-fable-5': {
                readonly in: 10;
                readonly out: 50;
            };
        };
        readonly openai: {
            readonly 'gpt-5.6-luna': {
                readonly in: 0.1;
                readonly out: 0.6;
            };
            readonly 'gpt-5.6-terra': {
                readonly in: 1;
                readonly out: 6;
            };
            readonly 'gpt-5.6-sol': {
                readonly in: 2;
                readonly out: 10;
            };
            readonly 'gpt-4o-mini': {
                readonly in: 0.15;
                readonly out: 0.6;
            };
            readonly 'gpt-4o': {
                readonly in: 2.5;
                readonly out: 10;
            };
            readonly o1: {
                readonly in: 15;
                readonly out: 60;
            };
        };
        readonly google: {
            readonly 'gemini-3.7-flash': {
                readonly in: 0.75;
                readonly out: 3.75;
            };
            readonly 'gemini-3.6-flash': {
                readonly in: 0.75;
                readonly out: 3.75;
            };
            readonly 'gemini-3.5-flash': {
                readonly in: 1.5;
                readonly out: 9;
            };
            readonly 'gemini-3.5-flash-lite': {
                readonly in: 0.3;
                readonly out: 2.5;
            };
            readonly 'gemini-3.1-flash-lite': {
                readonly in: 0.25;
                readonly out: 1.5;
            };
            readonly 'gemini-2.5-flash-lite': {
                readonly in: 0.1;
                readonly out: 0.4;
            };
            readonly 'gemini-2.5-flash': {
                readonly in: 0.3;
                readonly out: 2.5;
            };
            readonly 'gemini-2.5-pro': {
                readonly in: 1.25;
                readonly out: 10;
            };
        };
        readonly perplexity: {
            readonly sonar: {
                readonly in: 1;
                readonly out: 1;
            };
            readonly 'sonar-pro': {
                readonly in: 3;
                readonly out: 15;
            };
            readonly 'sonar-reasoning-pro': {
                readonly in: 2;
                readonly out: 8;
            };
        };
    };
};
export declare const TIER_MODELS: Readonly<Record<ModelTier, readonly TierModelEntry[]>>;
export declare const RESEARCH_INTENT_RE: RegExp;
/** Approximate token count. ~4 chars per token for English text. */
export declare function estimateTokens(text: string): number;
/**
 * Route a model recommendation based on structured input.
 * Deterministic, offline, zero LLM calls.
 *
 * 2-step algorithm:
 *   Step 1: Pick default tier from complexity + risk
 *   Step 2: Apply budget/latency overrides
 *
 * @param input - Structured routing input (G16: uses riskScore 0-100, not riskLevel)
 * @param promptText - Optional raw prompt for research intent detection (G15)
 * @param complexityConfidence - Confidence from classifyComplexity (for G3 formula)
 * @param target - Output/provider target for provider preference (default: 'claude')
 */
export declare function routeModel(input: ModelRoutingInput, promptText?: string, complexityConfidence?: number, target?: OutputTarget): ModelRecommendation;
/** Full cost estimation for a prompt. Multi-provider, target-aware. */
export declare function estimateCost(promptText: string, taskType?: TaskType, riskLevel?: RiskLevel, target?: OutputTarget): CostEstimate;
/** Standalone cost estimate for any text. Multi-provider. */
export declare function estimateCostForText(text: string, target?: OutputTarget): CostEstimate;
