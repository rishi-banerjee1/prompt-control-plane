#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';

const root = process.cwd();
const findings = [];
const warnings = [];

const sourceRoots = ['src', 'docs', 'video-explainer/src', 'video-explainer/scripts'];
const secretRoots = ['.', '.github', 'src', 'docs', 'scripts', 'test', 'video-explainer'];
const ignoredParts = new Set(['.git', 'node_modules', 'dist', 'out']);
const ignoredSecretFiles = new Set(['package-lock.json', 'video-explainer/package-lock.json']);
const textExts = new Set(['.html', '.js', '.mjs', '.ts', '.tsx', '.json', '.md', '.yml', '.yaml', '.sh']);

const dangerousJsPatterns = [
  ['JS-XSS-001', /\b(?:innerHTML|outerHTML)\b|insertAdjacentHTML\s*\(/, 'HTML parsing sink in production browser code'],
  ['JS-XSS-002', /document\.(?:write|writeln)\s*\(/, 'document.write/document.writeln sink'],
  ['JS-XSS-003', /\beval\s*\(|new\s+Function\s*\(|set(?:Timeout|Interval)\s*\(\s*["'`]/, 'string-to-code execution sink'],
  ['JS-XSS-004', /\.setAttribute\s*\(\s*["']on[a-z]+["']/, 'event handler attribute sink'],
  ['JS-MSG-001', /postMessage\s*\([^,\n]+,\s*["']\*["']\s*\)/, 'postMessage with wildcard targetOrigin'],
];

const secretPatterns = [
  ['SECRET-PRIVATE-KEY', /-----BEGIN (?:RSA |OPENSSH |EC |DSA |)?PRIVATE KEY-----/, 'private key material'],
  ['SECRET-GITHUB', /\bgh[pousr]_[A-Za-z0-9_]{36,}\b/, 'GitHub token'],
  ['SECRET-OPENAI', /\bsk-[A-Za-z0-9_-]{32,}\b/, 'OpenAI-style API key'],
  ['SECRET-SLACK', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/, 'Slack token'],
  ['SECRET-AWS', /\bAKIA[0-9A-Z]{16}\b/, 'AWS access key id'],
  ['SECRET-GOOGLE', /\bAIza[0-9A-Za-z_-]{35}\b/, 'Google API key'],
];

function shouldIgnore(path) {
  return path.split(sep).some(part => ignoredParts.has(part));
}

function walk(start, callback) {
  if (shouldIgnore(start)) return;
  let stat;
  try {
    stat = statSync(start);
  } catch {
    return;
  }
  if (stat.isDirectory()) {
    for (const entry of readdirSync(start)) walk(join(start, entry), callback);
    return;
  }
  callback(start);
}

function lineForIndex(text, index) {
  return text.slice(0, index).split('\n').length;
}

function scanJsText(file, text, offsetLine = 0) {
  for (const [rule, pattern, message] of dangerousJsPatterns) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match) {
      findings.push({
        rule,
        file: relative(root, file),
        line: offsetLine + lineForIndex(text, match.index),
        message,
      });
    }
  }
}

function scanHtmlScripts(file, text) {
  const scriptRe = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRe.exec(text))) {
    scanJsText(file, match[1], lineForIndex(text, match.index) - 1);
  }

  const handlerRe = /\son[a-z]+\s*=/gi;
  if (handlerRe.test(text)) {
    warnings.push({
      rule: 'JS-CSP-002',
      file: relative(root, file),
      line: lineForIndex(text, text.search(handlerRe)),
      message: 'inline event handlers weaken strict CSP; migrate during CSP hardening',
    });
  }
}

function scanSecrets(file, text) {
  const rel = relative(root, file);
  if (ignoredSecretFiles.has(rel)) return;
  for (const [rule, pattern, message] of secretPatterns) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match) {
      findings.push({
        rule,
        file: rel,
        line: lineForIndex(text, match.index),
        message,
      });
    }
  }
}

function scanActionPins(file, text) {
  for (const match of text.matchAll(/\buses:\s*([^\s#]+)@([^\s#]+)/g)) {
    const action = match[1];
    const ref = match[2];
    if (/^[0-9a-f]{40}$/.test(ref)) continue;
    findings.push({
      rule: 'CI-SUPPLY-001',
      file: relative(root, file),
      line: lineForIndex(text, match.index),
      message: `${action}@${ref} is not pinned to an immutable commit SHA`,
    });
  }
}

for (const dir of sourceRoots) {
  walk(join(root, dir), file => {
    const ext = extname(file);
    if (!textExts.has(ext)) return;
    const text = readFileSync(file, 'utf8');
    if (ext === '.html') scanHtmlScripts(file, text);
    if (['.js', '.mjs', '.ts', '.tsx'].includes(ext)) scanJsText(file, text);
  });
}

for (const dir of secretRoots) {
  walk(join(root, dir), file => {
    const ext = extname(file);
    if (!textExts.has(ext)) return;
    scanSecrets(file, readFileSync(file, 'utf8'));
  });
}

walk(join(root, '.github', 'workflows'), file => {
  if (!['.yml', '.yaml'].includes(extname(file))) return;
  scanActionPins(file, readFileSync(file, 'utf8'));
});
scanActionPins(join(root, 'action.yml'), readFileSync(join(root, 'action.yml'), 'utf8'));

if (warnings.length) {
  console.log('Security SAST warnings:');
  for (const warning of warnings) {
    console.log(`- ${warning.rule} ${warning.file}:${warning.line} ${warning.message}`);
  }
}

if (findings.length) {
  console.error('Security SAST findings:');
  for (const finding of findings) {
    console.error(`- ${finding.rule} ${finding.file}:${finding.line} ${finding.message}`);
  }
  process.exit(1);
}

console.log(`Security SAST passed (${warnings.length} warning${warnings.length === 1 ? '' : 's'}).`);
