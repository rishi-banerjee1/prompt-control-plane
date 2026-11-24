// src/validate.ts — Lightweight validation API for framework integrations.
// Zero MCP dependency. Imports only from pure analysis modules.
// Use: import { validate } from 'pcp-engine/validate'
import { analyzePrompt, detectTaskType } from './analyzer.js';
import { scorePrompt } from './scorer.js';
import { runRules } from './rules.js';
import { sortIssues } from './sort.js';
// ─── Core ───────────────────────────────────────────────────────────────────
/**
 * Validate a prompt's quality. Pure, synchronous, deterministic.
 * Returns pass/fail, score, task type, risk level, and top issues.
 *
 * @example
 * ```ts
 * import { validate } from 'pcp-engine/validate';
 *
 * const result = validate('Fix the bug in auth.ts');
 * if (!result.pass) {
 *   console.warn(`Prompt quality: ${result.score}/100`);
 *   result.issues.forEach(i => console.warn(`  - ${i.rule}: ${i.message}`));
 * }
 * ```
 */
export function validate(prompt, options) {
    const threshold = options?.threshold ?? 60;
    const context = options?.context;
    const taskType = detectTaskType(prompt);
    const intentSpec = analyzePrompt(prompt, context);
    const quality = scorePrompt(intentSpec, context);
    const ruleResults = runRules(prompt, context, taskType);
    const triggered = sortIssues(ruleResults).filter(r => r.triggered);
    const issues = triggered.slice(0, 5).map(r => ({
        rule: r.rule_name,
        severity: r.severity,
        message: r.message,
    }));
    return {
        pass: quality.total >= threshold,
        score: quality.total,
        threshold,
        task_type: taskType,
        risk_level: intentSpec.risk_level,
        issues,
    };
}
/**
 * Quick score check — returns just the numeric score (0-100).
 * Useful for inline checks where you don't need the full result.
 */
export function quickScore(prompt, context) {
    const intentSpec = analyzePrompt(prompt, context);
    return scorePrompt(intentSpec, context).total;
}
//# sourceMappingURL=validate.js.map