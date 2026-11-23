// test/languageRules.test.ts - Public copy language guardrails.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __test_dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__test_dirname, '..', '..');

const publicRoots = [
  'README.md',
  'CHANGELOG.md',
  'package.json',
  'server.json',
  'docs',
];

const textExtensions = new Set(['.html', '.css', '.js', '.json', '.md', '.sh']);

interface CopyViolation {
  file: string;
  rule: string;
  snippet: string;
}

function listPublicTextFiles(): string[] {
  const files: string[] = [];

  function walk(path: string): void {
    const stat = statSync(path);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(path)) {
        walk(join(path, entry));
      }
      return;
    }

    const ext = path.slice(path.lastIndexOf('.'));
    if (textExtensions.has(ext)) files.push(path);
  }

  for (const root of publicRoots) walk(join(repoRoot, root));
  return files.sort();
}

function stripHtmlRuntimeCode(text: string): string {
  let stripped = text.replace(/<!--[\s\S]*?-->/g, ' ');

  for (const tag of ['script', 'style']) {
    let lower = stripped.toLowerCase();
    let start = lower.indexOf(`<${tag}`);

    while (start !== -1) {
      const nextChar = lower[start + tag.length + 1];
      if (nextChar && !/[\s>/]/.test(nextChar)) {
        start = lower.indexOf(`<${tag}`, start + tag.length + 1);
        continue;
      }

      const endStart = lower.indexOf(`</${tag}`, start + tag.length + 1);
      if (endStart === -1) break;

      const endClose = lower.indexOf('>', endStart + tag.length + 2);
      if (endClose === -1) break;

      stripped = `${stripped.slice(0, start)} ${stripped.slice(endClose + 1)}`;
      lower = stripped.toLowerCase();
      start = lower.indexOf(`<${tag}`, start + 1);
    }
  }

  return stripped;
}

function htmlCopyText(text: string): string {
  const withoutRuntimeCode = stripHtmlRuntimeCode(text);
  const attributeCopy = Array.from(
    withoutRuntimeCode.matchAll(/\b(?:content|title|alt|aria-label|placeholder|value)=["']([^"']*)["']/gi),
    (match) => match[1],
  ).join('\n');

  const visibleText = withoutRuntimeCode
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');

  return `${attributeCopy}\n${visibleText}`;
}

function copyTextFor(file: string, text: string): string {
  if (file.endsWith('.sh')) return '';
  return file.endsWith('.html') ? htmlCopyText(text) : text;
}

function snippetAt(text: string, index: number): string {
  const start = Math.max(0, index - 50);
  const end = Math.min(text.length, index + 80);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

function findViolations(file: string, text: string, rules: Array<[string, RegExp]>): CopyViolation[] {
  const rel = relative(repoRoot, file);
  const violations: CopyViolation[] = [];

  for (const [rule, pattern] of rules) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match?.index !== undefined) {
      violations.push({ file: rel, rule, snippet: snippetAt(text, match.index) });
    }
  }

  return violations;
}

const dashRules: Array<[string, RegExp]> = [
  [
    'No dash-family typography or entities; use hyphen, comma, colon, or sentence break',
    /[\u2013\u2014\u2015\u2212]|&(?:m|n)dash;|&#(?:8211|8212);|&#x201[34];|\\u201[34]/i,
  ],
];

const framingRules: Array<[string, RegExp]> = [
  ['No "but" pivots in public copy', /\bbut\b/i],
  ['No "instead of" framing in public copy', /\binstead of\b/i],
  ['No "rather than" framing in public copy', /\brather than\b/i],
  ['No "versus" framing in public copy', /\bversus\b/i],
  ['No "vs" framing in public copy', /\bvs\.?\b/i],
  ['No "not X but Y" framing in public copy', /\bnot\b[^.!?\n]{0,80}\bbut\b/i],
  ['No "if X then Y" framing in public copy', /\bif\b[^.!?\n]{0,100}\bthen\b/i],
];

describe('public copy language rules', () => {
  it('does not use dash-family typography', () => {
    const violations = listPublicTextFiles().flatMap((file) => {
      const text = readFileSync(file, 'utf-8');
      return findViolations(file, text, dashRules);
    });

    assert.deepEqual(violations, []);
  });

  it('avoids weak contrast framing in public copy', () => {
    const violations = listPublicTextFiles().flatMap((file) => {
      const raw = readFileSync(file, 'utf-8');
      return findViolations(file, copyTextFor(file, raw), framingRules);
    });

    assert.deepEqual(violations, []);
  });
});
