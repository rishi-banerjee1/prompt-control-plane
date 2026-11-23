#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [version, stageArg, outputArg] = process.argv.slice(2);
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version ?? '') || !stageArg || !outputArg) {
  console.error('Usage: node scripts/prepare-mcpb.mjs <version> <stage-directory> <output-file>');
  process.exit(2);
}

const stage = resolve(stageArg);
const output = resolve(outputArg);
rmSync(stage, { recursive: true, force: true });
rmSync(output, { force: true });
mkdirSync(stage, { recursive: true });

for (const file of ['package.json', 'package-lock.json', 'LICENSE', 'README.md']) {
  cpSync(resolve(root, file), resolve(stage, file));
}
cpSync(resolve(root, 'node_modules'), resolve(stage, 'node_modules'), {
  recursive: true,
  dereference: true,
});

const prune = spawnSync('npm', [
  'prune', '--omit=dev', '--ignore-scripts', '--no-audit', '--offline', '--prefix', stage,
], { cwd: root, stdio: 'inherit' });
if (prune.error) throw prune.error;
if (prune.status !== 0) process.exit(prune.status ?? 1);

const packageJson = JSON.parse(readFileSync(resolve(stage, 'package.json'), 'utf8'));
writeFileSync(resolve(stage, 'package.json'), `${JSON.stringify({
  name: packageJson.name,
  version,
  type: packageJson.type,
  description: packageJson.description,
  license: packageJson.license,
  dependencies: packageJson.dependencies,
}, null, 2)}\n`);
rmSync(resolve(stage, 'package-lock.json'), { force: true });
cpSync(resolve(root, 'dist/src'), resolve(stage, 'dist/src'), { recursive: true });

const manifest = JSON.parse(readFileSync(resolve(root, 'mcpb/manifest.json'), 'utf8'));
manifest.version = version;
writeFileSync(resolve(stage, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const zip = spawnSync('zip', [
  '-X', '-q', '-r', output,
  'manifest.json', 'package.json', 'LICENSE', 'README.md', 'dist', 'node_modules',
  '-x', '*.map', '*/.cache/*', '*/.DS_Store', '*/Thumbs.db',
], { cwd: stage, stdio: 'inherit' });
if (zip.error) throw zip.error;
if (zip.status !== 0) process.exit(zip.status ?? 1);
console.log(`Created ${output}`);
