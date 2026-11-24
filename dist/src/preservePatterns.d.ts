/**
 * Mark untouchable lines based on preserve patterns and internal safety rules.
 * This runs once before the heuristic pipeline, ensuring all heuristics
 * automatically respect preserved lines without re-checking patterns.
 *
 * @param lines Text split into lines array
 * @param patterns User-provided regex patterns (strings) to preserve
 * @returns Set of 0-indexed line numbers that must not be modified
 */
export declare function markPreservedLines(lines: string[], patterns?: string[]): Set<number>;
/**
 * Check if a line is marked as preserved.
 * Used by heuristics to skip lines without re-checking patterns.
 *
 * @param lineNum 0-indexed line number
 * @param preserved Set of preserved line numbers
 * @returns true if line should not be modified
 */
export declare function isLinePreserved(lineNum: number, preserved: Set<number>): boolean;
/**
 * Helper: mark lines in a range as preserved (useful for heuristics that remove blocks).
 * @param startLine 0-indexed
 * @param endLine 0-indexed (inclusive)
 * @param preserved Mutable set to update
 */
export declare function preserveLineRange(startLine: number, endLine: number, preserved: Set<number>): void;
