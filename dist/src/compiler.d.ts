import type { IntentSpec, OutputTarget, CompressionConfig } from './types.js';
/** Compile an IntentSpec into a prompt. Target controls output format:
 * - claude (default): XML-tagged
 * - openai: { system, user } message split
 * - google, perplexity, generic: Markdown with ## headers
 * Returns the prompt string(s) and a list of changes made. */
export declare function compilePrompt(spec: IntentSpec, context?: string, target?: OutputTarget): {
    prompt: string;
    changes: string[];
    format_version: 1;
};
/** Overload signatures for compressContext supporting multiple call patterns.
 * v3.1.0: heuristics_applied + mode are new backward-compatible fields. */
export declare function compressContext(context: string): {
    compressed: string;
    removed: string[];
    originalTokens: number;
    compressedTokens: number;
    heuristics_applied: string[];
    mode: string;
};
export declare function compressContext(context: string, intent: string): {
    compressed: string;
    removed: string[];
    originalTokens: number;
    compressedTokens: number;
    heuristics_applied: string[];
    mode: string;
};
export declare function compressContext(context: string, intent: IntentSpec | string): {
    compressed: string;
    removed: string[];
    originalTokens: number;
    compressedTokens: number;
    heuristics_applied: string[];
    mode: string;
};
export declare function compressContext(context: string, config: CompressionConfig): {
    compressed: string;
    removed: string[];
    originalTokens: number;
    compressedTokens: number;
    heuristics_applied: string[];
    mode: string;
};
export declare function compressContext(context: string, intent: IntentSpec | string | undefined, config?: CompressionConfig): {
    compressed: string;
    removed: string[];
    originalTokens: number;
    compressedTokens: number;
    heuristics_applied: string[];
    mode: string;
};
