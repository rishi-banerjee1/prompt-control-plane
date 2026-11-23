// tools/index.ts — Entry point for modular tool registrations.
// Replaces the monolithic tools.ts with 4 focused modules.

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { StorageInterface, RateLimiter } from '../types.js';
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
export function registerTools(
  server: McpServer,
  storage: StorageInterface,
  rateLimiter: RateLimiter,
  engineVersion?: string,
): void {
  registerCoreTools(server, storage, rateLimiter, engineVersion);
  registerAnalysisTools(server, storage, rateLimiter, engineVersion);
  registerAdminTools(server, storage, rateLimiter, engineVersion);
  registerSessionTools(server, storage, rateLimiter, engineVersion);
}
