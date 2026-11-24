import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { StorageInterface, RateLimiter } from '../types.js';
export declare function registerSessionTools(server: McpServer, storage: StorageInterface, rateLimiter: RateLimiter, engineVersion?: string): void;
