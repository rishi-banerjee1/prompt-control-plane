import type { IntentSpec, TaskType, ComplexityResult } from './types.js';
export declare function detectTaskType(prompt: string): TaskType;
/**
 * Classify the reasoning complexity of a prompt. Deterministic.
 * Returns complexity type, confidence (0-100), and signals (key=value pairs).
 */
export declare function classifyComplexity(prompt: string, context?: string): ComplexityResult;
/** Decompose a raw prompt into a structured IntentSpec.
 *  @param answeredQuestionIds — IDs of blocking questions already answered (for refine flow)
 */
export declare function analyzePrompt(prompt: string, context?: string, answeredQuestionIds?: Set<string>): IntentSpec;
