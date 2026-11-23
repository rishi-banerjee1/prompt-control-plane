// src/validate.ts — Lightweight validation API for framework integrations.
// Zero MCP dependency. Imports only from pure analysis modules.
// Use: import { validate } from 'pcp-engine/validate'

import { analyzePrompt, detectTaskType } from './analyzer.js';
import { scorePrompt } from './scorer.js';
import { runRules } from './rules.js';
import { sortIssues } from './sort.js';
import type { TaskType, RiskLevel, OutputTarget } from './types.js';

// ─── Types ──────────────────────────────────────────────────────────────────

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
export function validate(prompt: string, options?: ValidateOptions): ValidateResult {
  const threshold = options?.threshold ?? 60;
  const context = options?.context;

  const taskType = detectTaskType(prompt);
  const intentSpec = analyzePrompt(prompt, context);
  const quality = scorePrompt(intentSpec, context);

  const ruleResults = runRules(prompt, context, taskType);
  const triggered = sortIssues(ruleResults).filter(r => r.triggered);
  const issues: ValidateIssue[] = triggered.slice(0, 5).map(r => ({
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
export function quickScore(prompt: string, context?: string): number {
  const intentSpec = analyzePrompt(prompt, context);
  return scorePrompt(intentSpec, context).total;
}

// Re-export types consumers might need
export type { TaskType, RiskLevel, OutputTarget };
