#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [version, sha256, repository, outputPath] = process.argv.slice(2);
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version ?? '') ||
    !/^[a-f0-9]{64}$/.test(sha256 ?? '') || !repository || !outputPath) {
  console.error('Usage: node scripts/create-mcp-registry-entry.mjs <version> <sha256> <owner/repo> <output-file>');
  process.exit(2);
}

const entry = JSON.parse(readFileSync(resolve(root, 'server.json'), 'utf8'));
if (entry.description.length > 100) {
  console.error(`MCP Registry description must be at most 100 characters; got ${entry.description.length}`);
  process.exit(1);
}
entry.version = version;
entry.packages = [{
  registryType: 'mcpb',
  identifier: `https://github.com/${repository}/releases/download/v${version}/pcp-engine-v${version}.mcpb`,
  fileSha256: sha256,
  transport: { type: 'stdio' },
}];
writeFileSync(resolve(outputPath), `${JSON.stringify(entry, null, 2)}\n`);
