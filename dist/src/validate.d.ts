import type { TaskType, RiskLevel, OutputTarget } from './types.js';
export interface ValidateOptions {
    /** Quality threshold (0-100). Default: 60 */
    threshold?: number;
    /** Additional context (code, docs, etc.) */
    context?: string;
}
export interface ValidateResult {
    /** Whether the prompt passed the quality threshold */
    pass: boolean;
    /** Quality score (0-100) */
    score: number;
    /** Applied threshold */
    threshold: number;
    /** Detected task type */
    task_type: TaskType;
    /** Detected risk level */
    risk_level: RiskLevel;
    /** Top issues found (max 5) */
    issues: ValidateIssue[];
}
export interface ValidateIssue {
    rule: string;
    severity: string;
    message: string;
}
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
export declare function validate(prompt: string, options?: ValidateOptions): ValidateResult;
/**
 * Quick score check — returns just the numeric score (0-100).
 * Useful for inline checks where you don't need the full result.
 */
export declare function quickScore(prompt: string, context?: string): number;
export type { TaskType, RiskLevel, OutputTarget };
