import type { ChecklistItem, RuleResult, ModelCost } from './types.js';
export declare const CHECKLIST_ORDER: readonly ["Role", "Goal", "Definition of Done", "Constraints", "Workflow", "Output Format", "Uncertainty Policy", "Audience", "Platform Guidelines"];
/** Sort checklist items in canonical order. */
export declare function sortChecklist(items: ChecklistItem[]): ChecklistItem[];
export interface CountEntry {
    key: string;
    count: number;
}
/** Sort a Record<string, number> by count desc, then key asc. Returns top N entries. */
export declare function sortCountsDescKeyAsc(record: Record<string, number>, limit?: number): CountEntry[];
/** Sort issues by severity desc (blocking first), then rule_name asc. */
export declare function sortIssues(issues: RuleResult[]): RuleResult[];
/** Sort cost entries by provider asc, then model asc. */
export declare function sortCostEntries(costs: ModelCost[]): ModelCost[];
