import type { IntentSpec, QualityScore, CompilationChecklist } from './types.js';
/** Score a prompt's quality based on its IntentSpec. Returns 0-100. */
export declare function scorePrompt(spec: IntentSpec, context?: string): QualityScore;
/** Generate a compilation checklist showing structural coverage of the compiled prompt.
 * This replaces the old scoreCompiledPrompt which was inaccurate (always ~90).
 * Checklist is a separate concept from numeric score — never enters aggregates. */
export declare function generateChecklist(compiledPrompt: string): CompilationChecklist;
