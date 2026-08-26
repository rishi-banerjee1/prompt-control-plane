#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const headerFile = resolve(process.cwd(), 'docs/_headers');
const text = readFileSync(headerFile, 'utf8');
const findings = [];
const warnings = [];

function headerValue(name) {
  const re = new RegExp(`^\\s*${name}:\\s*(.+)$`, 'mi');
  return re.exec(text)?.[1]?.trim() || '';
}

function fail(rule, message) {
  findings.push({ rule, message });
}

function warn(rule, message) {
  warnings.push({ rule, message });
}

const csp = headerValue('Content-Security-Policy');
const requiredHeaders = [
  ['X-Frame-Options', /^DENY$/i],
  ['X-Content-Type-Options', /^nosniff$/i],
  ['Referrer-Policy', /^(strict-origin-when-cross-origin|no-referrer)$/i],
  ['Permissions-Policy', /camera=\(\).*microphone=\(\).*geolocation=\(\)/i],
  ['Strict-Transport-Security', /max-age=(?:3[1-9]\d{6,}|[4-9]\d{7,}|\d{9,}).*includeSubDomains/i],
  ['Content-Security-Policy', /default-src\s+'self'/i],
];

for (const [name, expected] of requiredHeaders) {
  const value = headerValue(name);
  if (!value) fail('DAST-HEADERS-001', `${name} is missing in docs/_headers`);
  else if (!expected.test(value)) fail('DAST-HEADERS-001', `${name} does not meet baseline: ${value}`);
}

if (csp) {
  const requiredCsp = [
    ['script-src', /script-src[^;]*'self'/i],
    ['object-src', /object-src\s+'none'/i],
    ['base-uri', /base-uri\s+'self'/i],
    ['frame-ancestors', /frame-ancestors\s+'none'/i],
    ['form-action', /form-action[^;]*'self'[^;]*https:\/\/formspree\.io/i],
  ];
  for (const [directive, expected] of requiredCsp) {
    if (!expected.test(csp)) fail('DAST-CSP-001', `CSP must include ${directive} baseline`);
  }
  if (/script-src[^;]*\*/i.test(csp)) fail('DAST-CSP-001', 'CSP script-src must not allow wildcard sources');
  if (/unsafe-eval/i.test(csp)) fail('DAST-CSP-001', 'CSP must not allow unsafe-eval');
  if (/unsafe-inline/i.test(csp)) warn('DAST-CSP-002', 'CSP still allows unsafe-inline because static pages contain inline scripts/handlers');
}

async function checkLiveSite() {
  const baseUrl = process.env.DAST_BASE_URL;
  if (!baseUrl) return;
  const response = await fetch(baseUrl, { method: 'GET', redirect: 'manual' });
  if (!response.ok) fail('DAST-LIVE-001', `GET ${baseUrl} returned HTTP ${response.status}`);
  for (const [name] of requiredHeaders) {
    if (!response.headers.get(name)) fail('DAST-LIVE-001', `Live response missing ${name}`);
  }
}

await checkLiveSite();

if (warnings.length) {
  console.log('Security DAST warnings:');
  for (const warning of warnings) console.log(`- ${warning.rule} ${warning.message}`);
}

if (findings.length) {
  console.error('Security DAST findings:');
  for (const finding of findings) console.error(`- ${finding.rule} ${finding.message}`);
  process.exit(1);
}

console.log(`Security DAST passed (${warnings.length} warning${warnings.length === 1 ? '' : 's'}).`);
