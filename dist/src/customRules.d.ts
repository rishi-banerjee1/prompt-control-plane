import type { CustomRule, TaskType, RuleMatch } from './types.js';
export declare class CustomRulesManager {
    private readonly dataDir;
    constructor(dataDir?: string);
    /**
     * Load custom rules from disk and validate.
     * Returns sorted by ID, filtered (max 25), with invalid rules skipped.
     */
    loadRules(): Promise<CustomRule[]>;
    /**
     * Validate a single rule object.
     * Returns { valid: bool, errors: string[] }
     */
    validateRule(rule: any): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Evaluate a rule against a prompt.
     * Returns RuleMatch or null if rule doesn't apply to task type or doesn't match.
     */
    evaluateRule(rule: CustomRule, prompt: string, taskType: TaskType): Promise<RuleMatch | null>;
    /**
     * Get rules applicable to a task type, sorted by ID.
     */
    getRulesForTask(taskType: TaskType): Promise<CustomRule[]>;
    /**
     * Calculate deterministic rule-set hash.
     * Format: sorted by ID, then for each rule: id\npattern\nneg_pattern\napplies_to\nseverity\nrisk_dimension\nweight
     * Joined with \n, SHA-256 UTF-8 hex lowercase.
     */
    calculateRuleSetHash(rules: CustomRule[]): string;
    /**
     * Save custom rules to disk after full validation.
     * Validates every rule, sorts by ID, writes JSON, sets chmod 600 on POSIX.
     * Throws on validation failure or write error — callers should catch.
     */
    saveRules(rules: CustomRule[]): Promise<{
        saved_count: number;
        rule_ids: string[];
        rule_set_hash: string;
        file_path: string;
        created_at: string;
    }>;
    /**
     * Helper: Check if rule applies to task type.
     */
    private ruleAppliesToTaskType;
}
export declare const customRules: CustomRulesManager;
