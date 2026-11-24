// policy.ts — Pure policy evaluation module for v3.3.0.
// No MCP/tools dependency. All functions are pure and testable directly.
// Evaluates already-computed RuleResult[] — does NOT re-evaluate regexes.
import { createHash } from 'node:crypto';
// ─── Strictness Thresholds (canonical source) ───────────────────────────────
// Moved from tools.ts. Re-exported for backward compatibility.
export const STRICTNESS_THRESHOLDS = {
    relaxed: 40,
    standard: 60,
    strict: 75,
};
// ─── Policy Evaluation ──────────────────────────────────────────────────────
/**
 * Evaluate policy violations from already-computed rule results.
 * Returns violations only when policy_mode === 'enforce'.
 * Includes both built-in and custom BLOCKING rules.
 * Violations sorted by rule_id for determinism.
 */
export function evaluatePolicyViolations(ruleResults, config) {
    if (config.policy_mode !== 'enforce')
        return [];
    const violations = [];
    for (const result of ruleResults) {
        if (result.triggered && result.severity === 'blocking') {
            violations.push({
                rule_id: result.rule_name,
                description: result.message,
                severity: result.severity,
                risk_dimension: result.risk_elevation || undefined,
            });
        }
    }
    // Sort by rule_id for determinism
    violations.sort((a, b) => a.rule_id.localeCompare(b.rule_id));
    return violations;
}
/**
 * Check if risk score exceeds the strictness threshold.
 * Semantics (LOCKED): score >= threshold → exceeded (blocked).
 */
export function checkRiskThreshold(riskScore, strictness) {
    const threshold = STRICTNESS_THRESHOLDS[strictness] ?? STRICTNESS_THRESHOLDS.standard;
    return {
        exceeded: riskScore >= threshold,
        score: riskScore,
        threshold,
    };
}
/**
 * Build a policy enforcement summary for pre_flight responses.
 */
export function buildPolicyEnforcementSummary(violations, riskCheck) {
    return {
        mode: 'enforce',
        violations,
        risk_threshold_exceeded: riskCheck.exceeded,
        blocked: violations.length > 0 || riskCheck.exceeded,
    };
}
// ─── Policy Hash ────────────────────────────────────────────────────────────
/**
 * Calculate a deterministic policy hash for reproducibility.
 * SHA-256 of builtInHash + customHash + policyMode + strictness.
 * Answers: "prove this export was produced under policy X."
 */
export function calculatePolicyHash(opts) {
    const input = `${opts.builtInRuleSetHash}\n${opts.customRuleSetHash}\n${opts.policyMode}\n${opts.strictness}`;
    return createHash('sha256').update(input, 'utf8').digest('hex');
}
//# sourceMappingURL=policy.js.map