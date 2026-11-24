export { analyzePrompt, detectTaskType, classifyComplexity } from './analyzer.js';
export { scorePrompt } from './scorer.js';
export { generateChecklist } from './scorer.js';
export { compilePrompt, compressContext } from './compiler.js';
export { estimateCost, estimateTokens, estimateCostForText, PRICING_DATA, routeModel, TIER_MODELS, RESEARCH_INTENT_RE, } from './estimator.js';
export { runRules, extractBlockingQuestions, extractAssumptions, getElevatedRisk, computeRiskScore, computeRiskScoreWithCustomRules, RISK_WEIGHTS, RISK_ESCALATION_THRESHOLD, deriveRiskLevel, RULES_VERSION, calculateBuiltInRuleSetHash, } from './rules.js';
export { PROFILES, suggestProfile, resolveProfile } from './profiles.js';
export { validateLicenseKey, canonicalizePayload, PRODUCTION_PUBLIC_KEY_PEM } from './license.js';
export { estimatePromptTokens, estimateToolTokens, estimateOutputTokens } from './tokenizer.js';
export { scanZones, isLineInZone, isLinePreserved, getZonesInRange } from './zones.js';
export type { Zone } from './zones.js';
export { markPreservedLines } from './preservePatterns.js';
export { scoreAllTools, rankTools, pruneTools, scoreTool, rankMode, pruneMode } from './pruner.js';
export type { ToolDefinition, ToolScore, PruningResult } from './pruner.js';
export { calculateCompressionDelta, calculateToolPruningDelta, calculatePreFlightDeltas, formatDelta, formatPreFlightDeltas, } from './deltas.js';
export type { PreFlightDelta, PreFlightDeltas } from './deltas.js';
export { PRUNE_THRESHOLD, SIGNALS_CAP, LICENSE_SCAN_LINES, STRONG_LEGAL_TOKENS, ALWAYS_RELEVANT_TOOLS, TASK_REQUIRED_TOOLS, TASK_NEGATIVE_TOOLS, TASK_TOOL_KEYWORDS, stableStringify, } from './constants.js';
export { evaluatePolicyViolations, checkRiskThreshold, buildPolicyEnforcementSummary, calculatePolicyHash, STRICTNESS_THRESHOLDS, } from './policy.js';
export { AuditLogger, auditLogger, GENESIS_HASH } from './auditLog.js';
export { SessionHistoryManager, sessionHistory } from './sessionHistory.js';
export { CustomRulesManager, customRules } from './customRules.js';
export type { TaskType, RiskLevel, OutputTarget, Tier, Question, Assumption, RuleResult, IntentSpec, QualityDimension, QualityScore, ChecklistItem, CompilationChecklist, ModelCost, CostEstimate, PreviewPack, CompressionResult, CompressionPipelineResult, CompressionConfig, CompressContextResult, LicenseData, TierLimits, EnforcementResult, ReasoningComplexity, OptimizationProfile, ComplexityResult, RiskDimensions, RiskScore, SavingsComparison, TierModelEntry, ModelTier, ModelRoutingInput, ModelRecommendation, RuleMatch, CustomRule, CustomRulesConfig, PolicyMode, AuditEvent, AuditOutcome, AuditEntry, PolicyViolation, PurgeResult, SessionRecord, SessionListResponse, SessionExport, } from './types.js';
export { isCodeTask, isProseTask, PLAN_LIMITS } from './types.js';
export { PRO_PURCHASE_URL, POWER_PURCHASE_URL } from './tools/index.js';
import type { IntentSpec, QualityScore, CompilationChecklist, CostEstimate, OutputTarget } from './types.js';
/** Result of the full optimization pipeline. */
export interface OptimizeResult {
    /** Parsed intent from the raw prompt. */
    intent: IntentSpec;
    /** Quality score of the *raw* prompt (before compilation). */
    quality: QualityScore;
    /** Optimized prompt string (formatted for the target LLM). */
    compiled: string;
    /** List of structural changes applied during compilation. */
    changes: string[];
    /** Structural coverage checklist of the *compiled* output. */
    checklist: CompilationChecklist;
    /** Token + cost estimates for the compiled prompt. */
    cost: CostEstimate;
}
/**
 * Run the full optimization pipeline on a prompt.
 *
 * Mirrors the exact production chain from the `optimize_prompt` MCP tool:
 *   analyzePrompt → scorePrompt → compilePrompt → generateChecklist → estimateCost
 *
 * Pure, synchronous, deterministic. No I/O, no side effects.
 *
 * @param prompt  - The raw prompt to optimize.
 * @param context - Optional context string (code, docs, etc.).
 * @param target  - Target platform/provider: 'claude' (XML), 'openai' (System/User), or 'google'/'perplexity'/'generic' (Markdown).
 */
export declare function optimize(prompt: string, context?: string, target?: OutputTarget): OptimizeResult;
