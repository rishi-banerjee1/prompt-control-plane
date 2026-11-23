#!/usr/bin/env node

// index.ts — Entry point. Wires MCP server with storage, rate limiter, and stdio transport.

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools/index.js';
import { LocalFsStorage } from './storage/index.js';
import { LocalRateLimiter } from './rateLimit.js';
import { log, createRequestId } from './logger.js';

// Resolve repo root — works from both src/ (dev) and dist/src/ (compiled)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const findPackageJson = (): string => {
  // Walk up from current file until we find package.json
  const require = createRequire(import.meta.url);
  for (const rel of ['../package.json', '../../package.json']) {
    try { require.resolve(resolve(__dirname, rel)); return resolve(__dirname, rel); } catch { /* next */ }
  }
  return resolve(__dirname, '../package.json'); // fallback
};

// ─── CLI flags ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes('--version') || args.includes('-v')) {
  const require = createRequire(import.meta.url);
  const pkg = require(findPackageJson());
  console.log(`pcp-engine v${pkg.version}`);
  process.exit(0);
}

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Prompt Control Plane — Deterministic scoring, policy enforcement, audit & governance for AI prompts

Usage:
  pcp-engine          Start the MCP server (stdio transport)
  pcp-engine -v       Print version
  pcp-engine -h       Print this help

Environment:
  PROMPT_CONTROL_PLANE_LOG_LEVEL=debug     Log verbosity: debug, info, warn, error
  PROMPT_CONTROL_PLANE_LOG_PROMPTS=true    Enable raw prompt logging (never in shared envs)

  Community use:
  Unlimited monthly use, all features included, no license key required.
  All governance features are included under Apache-2.0; optional enterprise support is available.

Quick setup (any MCP-compatible client):
  Add to .mcp.json or ~/.claude/settings.json:
  {
    "mcpServers": {
      "prompt-control-plane": {
        "command": "npx",
        "args": ["-y", "pcp-engine"]
      }
    }
  }

More info: https://github.com/rishi-banerjee1/prompt-control-plane`);
  process.exit(0);
}

// ─── Server startup ──────────────────────────────────────────────────────────

const bootId = createRequestId();
log.info(bootId, 'Starting Prompt Control Plane server...');

const pkgRequire = createRequire(import.meta.url);
const pkg = pkgRequire(findPackageJson());

// Instance-scoped dependencies (not global mutable state)
const storage = new LocalFsStorage();
const rateLimiter = new LocalRateLimiter();

// Run initial session cleanup
await storage.cleanupSessions();

const server = new McpServer({
  name: 'prompt-control-plane',
  version: pkg.version,
});

registerTools(server, storage, rateLimiter, pkg.version);

const transport = new StdioServerTransport();
await server.connect(transport);

// Keep legacy tier metadata visible for compatibility; feature access is not tier-gated.
const bootUsage = await storage.getUsage();
log.info(bootId, `MCP server v${pkg.version} ready (tier=${bootUsage.tier}, tools=20)`);
