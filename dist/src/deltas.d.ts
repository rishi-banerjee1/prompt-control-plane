import type { CompressionPipelineResult } from './types.js';
import type { ToolScore } from './pruner.js';
/**
 * Pre-flight delta: estimated token savings from a single optimization
 */
export interface PreFlightDelta {
    optimization: 'compression' | 'tool_pruning';
    tokens_saved_estimate: number;
    percentage_reduction: number;
}
/**
 * All pre-flight deltas for a prompt
 */
export interface PreFlightDeltas {
    original_tokens: number;
    estimated_total_savings: number;
    deltas: PreFlightDelta[];
    summary: string;
}
/**
 * Calculate compression delta
 * Present only if compression actually reduces tokens
 */
export declare function calculateCompressionDelta(compressionResult: CompressionPipelineResult): PreFlightDelta | null;
/**
 * Calculate tool pruning delta
 * Present only if pruning would remove tools
 */
export declare function calculateToolPruningDelta(scores: ToolScore[], prunedTools: string[]): PreFlightDelta | null;
/**
 * Calculate all pre-flight deltas
 */
export declare function calculatePreFlightDeltas(compressionResult: CompressionPipelineResult | null, toolScores: ToolScore[] | null, prunedTools: string[] | null): PreFlightDeltas;
/**
 * Format delta for human readability
 */
export declare function formatDelta(delta: PreFlightDelta): string;
/**
 * Format all deltas for human readability
 */
export declare function formatPreFlightDeltas(deltas: PreFlightDeltas): string;
