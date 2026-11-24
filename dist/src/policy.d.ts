import type { RuleResult, PolicyViolation } from './types.js';
export declare const STRICTNESS_THRESHOLDS: Record<string, number>;
/**
 * Evaluate policy violations from already-computed rule results.
 * Returns violations only when policy_mode === 'enforce'.
 * Includes both built-in and custom BLOCKING rules.
 * Violations sorted by rule_id for determinism.
 */
export declare function evaluatePolicyViolations(ruleResults: RuleResult[], config: {
    policy_mode?: string;
}): PolicyViolation[];
export interface RiskThresholdCheck {
    exceeded: boolean;
    score: number;
    threshold: number;
}
/**
 * Check if risk score exceeds the strictness threshold.
 * Semantics (LOCKED): score >= threshold → exceeded (blocked).
 */
export declare function checkRiskThreshold(riskScore: number, strictness: string): RiskThresholdCheck;
export interface PolicyEnforcementSummary {
    mode: string;
    violations: PolicyViolation[];
    risk_threshold_exceeded: boolean;
    blocked: boolean;
}
/**
 * Build a policy enforcement summary for pre_flight responses.
 */
export declare function buildPolicyEnforcementSummary(violations: PolicyViolation[], riskCheck: RiskThresholdCheck): PolicyEnforcementSummary;
/**
 * Calculate a deterministic policy hash for reproducibility.
 * SHA-256 of builtInHash + customHash + policyMode + strictness.
 * Answers: "prove this export was produced under policy X."
 */
export declare function calculatePolicyHash(opts: {
    builtInRuleSetHash: string;
    customRuleSetHash: string;
    policyMode: string;
    strictness: string;
}): string;
