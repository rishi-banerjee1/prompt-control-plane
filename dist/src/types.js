// types.ts — All TypeScript interfaces for Prompt Control Plane v4.0.
// This is the interface contract: Phase B must not change these shapes.
/** Whether a task type is code-related. Used by rules, scorer, and compiler to adapt behavior. */
export function isCodeTask(taskType) {
    return ['code_change', 'debug', 'create', 'refactor'].includes(taskType);
}
/** Whether a task type involves prose/communication. */
export function isProseTask(taskType) {
    return ['writing', 'communication', 'planning'].includes(taskType);
}
export const PLAN_LIMITS = {
    free: { lifetime: Infinity, monthly: Infinity, rate_per_minute: 60, always_on: true },
    pro: { lifetime: Infinity, monthly: Infinity, rate_per_minute: 60, always_on: true },
    power: { lifetime: Infinity, monthly: Infinity, rate_per_minute: 60, always_on: true },
    enterprise: { lifetime: Infinity, monthly: Infinity, rate_per_minute: 60, always_on: true },
};
//# sourceMappingURL=types.js.map