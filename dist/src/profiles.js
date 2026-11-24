// profiles.ts — 5 frozen optimization profiles for the v3 decision engine.
// Profiles provide sensible defaults for ModelRoutingInput fields.
// Explicit user inputs ALWAYS override profile defaults.
// enterprise_safe is never auto-suggested (G5).
import { RISK_ESCALATION_THRESHOLD } from './rules.js';
// ─── Frozen Profile Presets ──────────────────────────────────────────────────
export const PROFILES = Object.freeze({
    cost_minimizer: Object.freeze({
        tier: 'small',
        temperature: 0.3,
        maxTokensCap: 2000,
        budgetSensitivity: 'high',
        latencySensitivity: 'medium',
    }),
    balanced: Object.freeze({
        tier: 'mid',
        temperature: 0.5,
        maxTokensCap: 4000,
        budgetSensitivity: 'medium',
        latencySensitivity: 'medium',
    }),
    quality_first: Object.freeze({
        tier: 'top',
        temperature: 0.3,
        maxTokensCap: 8000,
        budgetSensitivity: 'low',
        latencySensitivity: 'low',
    }),
    creative: Object.freeze({
        tier: 'mid',
        temperature: 0.9,
        maxTokensCap: 8000,
        budgetSensitivity: 'medium',
        latencySensitivity: 'low',
    }),
    enterprise_safe: Object.freeze({
        tier: 'top',
        temperature: 0.1,
        maxTokensCap: 4000,
        budgetSensitivity: 'low',
        latencySensitivity: 'low',
    }),
});
// ─── Profile Suggestion (G5: deterministic mapping) ──────────────────────────
/**
 * Suggest a profile based on complexity + risk score.
 * enterprise_safe is NEVER auto-suggested (user-selected only).
 * Returns 'balanced' as fallback for unknown complexity types.
 */
export function suggestProfile(complexity, riskScore) {
    switch (complexity) {
        case 'simple_factual':
            return 'cost_minimizer';
        case 'analytical':
            return 'balanced';
        case 'multi_step':
            return riskScore >= RISK_ESCALATION_THRESHOLD ? 'quality_first' : 'balanced';
        case 'creative':
            return 'creative';
        case 'long_context':
            return 'balanced';
        case 'agent_orchestration':
            return riskScore >= RISK_ESCALATION_THRESHOLD ? 'quality_first' : 'balanced';
        default:
            return 'balanced';
    }
}
/**
 * Resolve a profile name, falling back to 'balanced' for invalid names.
 * Adds a decision_path entry when fallback is used.
 */
export function resolveProfile(profileName, decisionPath) {
    if (!profileName)
        return 'balanced';
    const validProfiles = [
        'cost_minimizer', 'balanced', 'quality_first', 'creative', 'enterprise_safe',
    ];
    if (validProfiles.includes(profileName)) {
        return profileName;
    }
    // Invalid profile → fallback to balanced + decision_path warning
    decisionPath.push(`profile_fallback=${profileName}→balanced`);
    return 'balanced';
}
//# sourceMappingURL=profiles.js.map