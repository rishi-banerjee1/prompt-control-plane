/** Maximum line number to scan for license/header blocks (H2). */
export declare const LICENSE_SCAN_LINES = 40;
/** Strong legal tokens that must be present to trigger license removal. */
export declare const STRONG_LEGAL_TOKENS: RegExp;
/** Maximum character length for JSON whole-input detection. */
export declare const JSON_MAX_CHARS = 200000;
/** Default threshold for pruning tools (0-100 relevance score). */
export declare const PRUNE_THRESHOLD = 15;
/** Maximum number of signals to consider in pruner scoring (cap to avoid explosion). */
export declare const SIGNALS_CAP = 10;
/** Task type keywords for pruner relevance matching (common tool/task overlaps). */
export declare const TASK_TOOL_KEYWORDS: Record<string, string[]>;
/** Tools that should always be considered relevant (never pruned). */
export declare const ALWAYS_RELEVANT_TOOLS: Set<string>;
/** Task-type-specific tools that are high-confidence matches. */
export declare const TASK_REQUIRED_TOOLS: Record<string, string[]>;
/** Negative signals: tools to deprioritize for specific task types. */
export declare const TASK_NEGATIVE_TOOLS: Record<string, string[]>;
/** Token budget threshold for "mismatch" detection (per tier). */
export declare const TIER_TOKEN_BUDGETS: Record<string, number>;
/** Stopwords to exclude from intent overlap scoring (prevent inflated signals). */
export declare const STOPWORDS: Set<string>;
/**
 * Stable stringify for tool definitions: sorted keys, no whitespace, deterministic.
 * Used by pruner for consistent tokens_saved estimation.
 * Must produce identical output across runs for the same object.
 *
 * @param obj Object to stringify
 * @returns Deterministic JSON string (no whitespace)
 */
export declare function stableStringify(obj: unknown): string;
