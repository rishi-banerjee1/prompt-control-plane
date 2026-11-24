import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { StorageInterface, RateLimiter } from '../types.js';
export { PRO_PURCHASE_URL, POWER_PURCHASE_URL, ENTERPRISE_PURCHASE_URL } from './helpers.js';
/**
 * Register all 20 MCP tools on the given server.
 * Drop-in replacement for the original registerTools() from tools.ts.
 */
export declare function registerTools(server: McpServer, storage: StorageInterface, rateLimiter: RateLimiter, engineVersion?: string): void;
