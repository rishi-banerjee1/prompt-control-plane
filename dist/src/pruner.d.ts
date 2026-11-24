import type { IntentSpec } from './types.js';
/**
 * Tool definition: name + description for scoring
 */
export interface ToolDefinition {
    name: string;
    description: string;
}
/**
 * Scoring result for a single tool
 */
export interface ToolScore {
    name: string;
    relevance_score: number;
    signals: string[];
    tokens_saved_estimate: number;
}
/**
 * Pruning result
 */
export interface PruningResult {
    tools: ToolScore[];
    pruned_count: number;
    pruned_tools: string[];
    tokens_saved_estimate: number;
    mode: 'rank' | 'prune';
}
/**
 * Score a single tool against the intent
 */
export declare function scoreTool(tool: ToolDefinition, spec: IntentSpec | undefined, taskKeywordsMap: Record<string, string[]>): ToolScore;
/**
 * Score all tools against the intent
 */
export declare function scoreAllTools(tools: ToolDefinition[], spec: IntentSpec | undefined, taskKeywordsMap?: Record<string, string[]>): ToolScore[];
/**
 * Rank tools by relevance (highest to lowest)
 */
export declare function rankTools(scores: ToolScore[]): ToolScore[];
/**
 * Prune tools: mark bottom-M as removable
 * Respects mention protection and always-relevant tools
 */
export declare function pruneTools(scores: ToolScore[], intent: string | undefined, pruneCount: number): PruningResult;
/**
 * Rank mode: return all tools ranked by relevance
 */
export declare function rankMode(tools: ToolDefinition[], spec: IntentSpec | undefined): PruningResult;
/**
 * Prune mode: return tools with bottom-M marked as pruned
 */
export declare function pruneMode(tools: ToolDefinition[], spec: IntentSpec | undefined, intent: string | undefined, pruneThreshold?: number): PruningResult;
