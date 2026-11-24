// tools/index.ts — Entry point for modular tool registrations.
// Replaces the monolithic tools.ts with 4 focused modules.
import { registerCoreTools } from './core.js';
import { registerAnalysisTools } from './analysis.js';
import { registerAdminTools } from './admin.js';
import { registerSessionTools } from './sessions.js';
// Re-export purchase URLs for backward compatibility (used by api.ts and tests)
export { PRO_PURCHASE_URL, POWER_PURCHASE_URL, ENTERPRISE_PURCHASE_URL } from './helpers.js';
/**
 * Register all 20 MCP tools on the given server.
 * Drop-in replacement for the original registerTools() from tools.ts.
 */
export function registerTools(server, storage, rateLimiter, engineVersion) {
    registerCoreTools(server, storage, rateLimiter, engineVersion);
    registerAnalysisTools(server, storage, rateLimiter, engineVersion);
    registerAdminTools(server, storage, rateLimiter, engineVersion);
    registerSessionTools(server, storage, rateLimiter, engineVersion);
}
//# sourceMappingURL=index.js.map