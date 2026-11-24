import type { RuleResult, RiskLevel, RiskScore, RiskDimensions, TaskType, IntentSpec, RuleMatch } from './types.js';
/** Run applicable ambiguity rules against a prompt. Task-type aware. */
export declare function runRules(prompt: string, context?: string, taskType?: TaskType): RuleResult[];
/** Extract blocking questions from rule results. Capped at 3.
 *  @param answeredIds — IDs of questions already answered (skipped during refine)
 */
export declare function extractBlockingQuestions(results: RuleResult[], answeredIds?: Set<string>): import("./types.js").Question[];
/** Extract assumptions from rule results. Capped at 5. */
export declare function extractAssumptions(results: RuleResult[]): import("./types.js").Assumption[];
/** Determine if any rule elevates risk level. */
export declare function getElevatedRisk(results: RuleResult[]): RiskLevel | undefined;
/** Threshold at which risk escalates routing tier (G11: no magic numbers). */
export declare const RISK_ESCALATION_THRESHOLD = 40;
/** Built-in rules version. Rule count derived from the rules array — never hardcoded. */
export declare const RULES_VERSION: string;
/**
 * Deterministic SHA-256 hash of all built-in rules.
 *
 * Hash input per rule: name + applies_to + RISK_WEIGHTS entry (or 'elevation').
 * Plus a global fingerprint of all shared pattern libraries and v3.1 inline regex
 * sources. Uses RegExp.toString() (ECMA-262 §22.2.5.12, spec-stable across V8
 * versions) instead of Function.toString() (V8-dependent whitespace/comments).
 *
 * Sorted by rule name → joined with \n → SHA-256 UTF-8 hex lowercase.
 */
export declare function calculateBuiltInRuleSetHash(): string;
/** Explicit risk weights for each rule. Dimension + base + blocking multiplier.
 *  G4: unknown rules are ignored with a decision_path warning. */
export declare const RISK_WEIGHTS: Record<string, {
    dimension: keyof RiskDimensions;
    base: number;
    blockingMultiplier: number;
}>;
/** Derive RiskLevel from numeric score (G14: score drives routing, level is display-only). */
export declare function deriveRiskLevel(score: number): RiskLevel;
/**
 * Compute dimensional risk score from triggered rules.
 * Score = sum of triggered rule weights (base × blockingMultiplier if blocking), capped at 100.
 * Each dimension scored independently. All 4 dimensions always present (default 0).
 *
 * @param ruleResults - Triggered rule results from runRules()
 * @param _intent - IntentSpec (reserved for future risk rules)
 * @returns RiskScore with numeric score, dimensions, and derived level
 */
export declare function computeRiskScore(ruleResults: RuleResult[], _intent?: IntentSpec): RiskScore;
/**
 * Async wrapper: compute risk score from built-in rules, then augment with custom rules.
 * Custom rule weights are additive via RuleMatch.custom_weight + risk_dimension.
 * RISK_WEIGHTS is never mutated. Decision_path custom annotations capped at 5.
 *
 * @param ruleResults - Built-in triggered rule results from runRules()
 * @param prompt - Raw prompt text (for custom rule evaluation)
 * @param taskType - Detected task type (for custom rule filtering)
 * @returns { riskScore, customRuleMatches }
 */
export declare function computeRiskScoreWithCustomRules(ruleResults: RuleResult[], prompt: string, taskType: TaskType): Promise<{
    riskScore: RiskScore;
    customRuleMatches: RuleMatch[];
}>;
