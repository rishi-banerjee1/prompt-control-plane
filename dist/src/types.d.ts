export type TaskType = 'code_change' | 'question' | 'review' | 'debug' | 'create' | 'refactor' | 'writing' | 'research' | 'planning' | 'analysis' | 'communication' | 'data' | 'other';
/** Whether a task type is code-related. Used by rules, scorer, and compiler to adapt behavior. */
export declare function isCodeTask(taskType: TaskType): boolean;
/** Whether a task type involves prose/communication. */
export declare function isProseTask(taskType: TaskType): boolean;
export type RiskLevel = 'low' | 'medium' | 'high';
export type SessionState = 'ANALYZING' | 'COMPILED' | 'APPROVED';
export type RuleSeverity = 'blocking' | 'non_blocking';
/** Canonical routing tier for the decision engine (G9: small/mid/top everywhere). */
export type ModelTier = 'small' | 'mid' | 'top';
export type ReasoningComplexity = 'simple_factual' | 'analytical' | 'multi_step' | 'creative' | 'long_context' | 'agent_orchestration';
export type OptimizationProfile = 'cost_minimizer' | 'balanced' | 'quality_first' | 'creative' | 'enterprise_safe';
export interface ComplexityResult {
    complexity: ReasoningComplexity;
    confidence: number;
    signals: string[];
}
export interface RiskDimensions {
    underspec: number;
    hallucination: number;
    scope: number;
    constraint: number;
}
export interface RiskScore {
    score: number;
    dimensions: RiskDimensions;
    level: RiskLevel;
}
export interface SavingsComparison {
    baselineModel: string;
    baselineCost: number;
    recommendedCost: number;
    savingsPercent: number;
}
export interface TierModelEntry {
    provider: string;
    model: string;
    defaultTemp: number;
    maxTokensCap: number;
}
export interface ModelRoutingInput {
    taskType: TaskType;
    complexity: ReasoningComplexity;
    budgetSensitivity: 'low' | 'medium' | 'high';
    latencySensitivity: 'low' | 'medium' | 'high';
    contextTokens: number;
    riskScore: number;
    profile?: OptimizationProfile;
}
export interface ModelRecommendation {
    primary: {
        model: string;
        provider: string;
        temperature: number;
        maxTokens: number;
    };
    fallback: {
        model: string;
        provider: string;
        reason: string;
    };
    confidence: number;
    costEstimate: CostEstimate;
    rationale: string;
    tradeoffs: string[];
    savings_vs_default: SavingsComparison;
    savings_summary: string;
    decision_path: string[];
}
export type OutputTarget = 'claude' | 'openai' | 'google' | 'perplexity' | 'generic';
export interface TierLimits {
    lifetime: number;
    monthly: number;
    rate_per_minute: number;
    always_on: boolean;
}
/** Serialized tier limits (Infinity → null for JSON safety). */
export interface SerializedTierLimits {
    lifetime: number | null;
    monthly: number | null;
    rate_per_minute: number;
    always_on: boolean;
}
export declare const PLAN_LIMITS: Record<string, TierLimits>;
export type Tier = 'free' | 'pro' | 'power' | 'enterprise';
export interface Question {
    id: string;
    question: string;
    reason: string;
    blocking: boolean;
}
export interface Assumption {
    id: string;
    assumption: string;
    confidence: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    reversible: boolean;
}
export interface RuleResult {
    rule_name: string;
    severity: RuleSeverity;
    triggered: boolean;
    message: string;
    question?: Question;
    assumption?: Assumption;
    risk_elevation?: RiskLevel;
}
export interface IntentSpec {
    user_intent: string;
    goal: string;
    definition_of_done: string[];
    task_type: TaskType;
    inputs_detected: string[];
    constraints: {
        scope: string[];
        forbidden: string[];
        time_budget?: string;
    };
    output_format: string;
    risk_level: RiskLevel;
    assumptions: Assumption[];
    blocking_questions: Question[];
    audience?: string;
    tone?: string;
    platform?: string;
}
export interface QualityDimension {
    name: string;
    score: number;
    max: number;
    notes: string[];
}
export interface QualityScore {
    total: number;
    max: 100;
    dimensions: QualityDimension[];
    confidence: 'low' | 'medium' | 'high';
    confidence_note: string;
}
export interface ChecklistItem {
    name: string;
    present: boolean;
    note?: string;
}
export interface CompilationChecklist {
    items: ChecklistItem[];
    summary: string;
}
export interface ModelCost {
    model: string;
    provider: string;
    input_tokens: number;
    estimated_output_tokens: number;
    input_cost_usd: number;
    output_cost_usd: number;
    total_cost_usd: number;
}
export interface CostEstimate {
    input_tokens: number;
    estimated_output_tokens: number;
    costs: ModelCost[];
    recommended_model: string;
    recommendation_reason: string;
}
export interface PreviewPack {
    request_id: string;
    session_id: string;
    state: SessionState;
    intent_spec: IntentSpec;
    quality_before: QualityScore;
    compiled_prompt: string;
    compilation_checklist: CompilationChecklist;
    blocking_questions: Question[];
    assumptions: Assumption[];
    cost_estimate: CostEstimate;
    model_recommendation: string;
    changes_made: string[];
    target: OutputTarget;
    format_version: 1;
    scoring_version: 2;
    storage_health?: 'ok' | 'degraded';
}
export interface Session {
    id: string;
    state: SessionState;
    created_at: number;
    last_accessed: number;
    raw_prompt: string;
    context?: string;
    target: OutputTarget;
    intent_spec: IntentSpec;
    compiled_prompt: string;
    quality_before: QualityScore;
    compilation_checklist: CompilationChecklist;
    cost_estimate: CostEstimate;
    answers: Record<string, string>;
}
export interface SessionRecord {
    schema_version: 1;
    session_id: string;
    created_at: number;
    state: SessionState;
    task_type: TaskType;
    quality_before: number;
    confidence: 'low' | 'medium' | 'high';
    prompt_hash: string;
    prompt_length: number;
    target: OutputTarget;
}
export interface SessionExport {
    schema_version: 1;
    session_id: string;
    created_at: number;
    state: SessionState;
    raw_prompt: string;
    compiled_prompt: string;
    quality_before: number;
    confidence: 'low' | 'medium' | 'high';
    rule_set_hash: string;
    rule_set_version: string;
    metadata: {
        target: OutputTarget;
        task_type: TaskType;
        complexity: ReasoningComplexity;
        risk_score: number;
        custom_rules_applied: string[];
        custom_rule_set_hash: string;
        engine_version?: string;
        policy_mode?: string;
        policy_hash?: string;
    };
}
export interface SessionListResponse {
    schema_version: 1;
    sessions: SessionRecord[];
    total_sessions: number;
    storage_path: string;
}
export interface CustomRule {
    id: string;
    description: string;
    pattern: string;
    negative_pattern?: string;
    applies_to: 'code' | 'prose' | 'all';
    severity: 'BLOCKING' | 'NON-BLOCKING';
    risk_dimension: 'hallucination' | 'constraint' | 'underspec' | 'scope';
    risk_weight: number;
}
export interface CustomRulesConfig {
    schema_version: 1;
    created_at: number;
    rules: CustomRule[];
}
export interface RuleMatch {
    rule_id: string;
    matched: boolean;
    description: string;
    severity: 'BLOCKING' | 'NON-BLOCKING';
    custom_weight?: number;
    risk_dimension?: 'hallucination' | 'constraint' | 'underspec' | 'scope';
    error?: string;
}
export interface CompressionConfig {
    mode?: 'standard' | 'aggressive';
    tokenBudget?: number;
    preservePatterns?: string[];
    enableStubCollapse?: boolean;
}
export interface CompressionResult {
    original_tokens: number;
    compressed_tokens: number;
    tokens_saved: number;
    savings_percent: number;
    compressed_context: string;
    removed_sections: string[];
}
/**
 * Result of running compression pipeline.
 * heuristics_applied: identifiers only (H2, H3, H1, H4, H5) in stable order
 * warnings: separate channel for regex compilation errors, etc.
 */
export interface CompressionPipelineResult {
    compressed: string;
    originalTokens: number;
    compressedTokens: number;
    heuristics_applied: string[];
    removed_sections: string[];
    warnings: string[];
    mode: 'standard' | 'aggressive';
}
export interface CompressContextResult {
    compressed: string;
    removed: string[];
    originalTokens: number;
    compressedTokens: number;
    heuristics_applied?: string[];
    mode?: 'standard' | 'aggressive';
}
export interface LicenseData {
    schema_version: 1;
    tier: Tier;
    issued_at: string;
    expires_at: string;
    license_id: string;
    activated_at: string;
    valid: boolean;
    validation_error?: string;
}
export interface UsageData {
    schema_version: 1;
    total_optimizations: number;
    current_period_start?: string;
    period_optimizations?: number;
    first_used_at: string;
    last_used_at: string;
    tier: Tier;
}
export type PolicyMode = 'advisory' | 'enforce';
export type AuditEvent = 'optimize' | 'approve' | 'delete' | 'purge' | 'configure' | 'license_activate' | 'save_custom_rules';
export type AuditOutcome = 'success' | 'blocked' | 'error';
/**
 * Audit trail entry. Append-only JSONL format.
 * PRIVACY INVARIANT: Never stores raw_prompt, compiled_prompt, or prompt_preview.
 * details field: max 10 keys, typed values only (string | number | boolean).
 */
export interface AuditEntry {
    timestamp: string;
    event: AuditEvent;
    session_id?: string;
    request_id: string;
    task_type?: string;
    risk_score?: number;
    routing_tier?: string;
    rule_set_hash?: string;
    policy_mode?: string;
    outcome: AuditOutcome;
    details?: Record<string, string | number | boolean>;
    integrity_hash?: string;
}
/**
 * Policy violation returned when enforce mode blocks an action.
 */
export interface PolicyViolation {
    rule_id: string;
    description: string;
    severity: string;
    risk_dimension?: string;
}
export interface PurgeResult {
    deleted_count: number;
    retained_count: number;
    scanned_count: number;
    deleted_session_ids: string[];
    truncated: boolean;
    dry_run: boolean;
    no_op: boolean;
    cutoff_date?: string;
    effective_older_than_days?: number;
}
export interface OptimizerConfig {
    schema_version: 1;
    mode: 'manual' | 'always_on';
    threshold: number;
    strictness: 'relaxed' | 'standard' | 'strict';
    auto_compile: boolean;
    default_target: OutputTarget;
    ephemeral_mode: boolean;
    max_sessions: number;
    max_session_size_kb: number;
    max_session_dir_mb: number;
    session_retention_days?: number;
    policy_mode?: PolicyMode;
    audit_log?: boolean;
    locked_config?: boolean;
    lock_secret_hash?: string;
}
export interface StatsData {
    schema_version: 1;
    scoring_version: 2;
    total_optimized: number;
    total_approved: number;
    score_sum_before: number;
    task_type_counts: Record<string, number>;
    blocking_question_counts: Record<string, number>;
    estimated_cost_savings_usd: number;
}
export interface StatsEvent {
    type: 'optimize' | 'approve';
    score_before?: number;
    task_type?: string;
    blocking_questions?: string[];
    cost_savings_usd?: number;
}
export interface EnforcementResult {
    allowed: boolean;
    enforcement: 'lifetime' | 'monthly' | 'rate' | 'always_on' | 'error' | null;
    usage: UsageData;
    limits: SerializedTierLimits;
    remaining: {
        lifetime: number | null;
        monthly: number;
    };
    retry_after_seconds?: number;
}
export interface RateLimiter {
    check(tier: string): {
        allowed: boolean;
        retry_after_seconds?: number;
    };
}
export interface Logger {
    debug: (requestId: string, ...args: unknown[]) => void | boolean;
    info: (requestId: string, ...args: unknown[]) => void | boolean;
    warn: (requestId: string, ...args: unknown[]) => void | boolean;
    error: (requestId: string, ...args: unknown[]) => void | boolean;
    prompt: (requestId: string, label: string, content: string) => void | boolean;
}
export interface ExecutionContext {
    requestId: string;
    storage: StorageInterface;
    logger: Logger;
    config: OptimizerConfig;
    rateLimiter: RateLimiter;
    tier: Tier;
}
export interface StorageInterface {
    health(): Promise<'ok' | 'degraded'>;
    getUsage(): Promise<UsageData>;
    incrementUsage(): Promise<UsageData>;
    canUseOptimization(ctx: ExecutionContext): Promise<EnforcementResult>;
    isProTier(): Promise<boolean>;
    getConfig(): Promise<OptimizerConfig>;
    setConfig(config: Partial<OptimizerConfig>): Promise<OptimizerConfig>;
    saveSession(session: Session): Promise<void>;
    loadSession(id: string): Promise<Session | undefined>;
    deleteSession(id: string): Promise<void>;
    cleanupSessions(): Promise<void>;
    getStats(): Promise<StatsData>;
    updateStats(event: StatsEvent): Promise<void>;
    getLicense(): Promise<LicenseData | null>;
    setLicense(data: LicenseData): Promise<void>;
    clearLicense(): Promise<void>;
}
