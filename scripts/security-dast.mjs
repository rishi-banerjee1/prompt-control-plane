#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { inspectHtml } from './html-security.mjs';

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
const accessControlAllowOrigin = headerValue('Access-Control-Allow-Origin');
if (accessControlAllowOrigin === '*') {
  fail('DAST-CORS-001', 'Static site must not expose wildcard cross-origin reads');
}

const requiredHeaders = [
  ['X-Frame-Options', /^DENY$/i],
  ['X-Content-Type-Options', /^nosniff$/i],
  ['Referrer-Policy', /^(strict-origin-when-cross-origin|no-referrer)$/i],
  ['Permissions-Policy', /camera=\(\).*microphone=\(\).*geolocation=\(\)/i],
  ['Cross-Origin-Opener-Policy', /^same-origin$/i],
  ['Cross-Origin-Embedder-Policy', /^credentialless$/i],
  ['Cross-Origin-Resource-Policy', /^same-origin$/i],
  ['Access-Control-Allow-Origin', /^https:\/\/getpcp\.site(?:,\s*https:\/\/getpcp\.site)*$/i],
  ['Vary', /(?:^|,\s*)Origin(?:\s*,|$)/i],
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
  if (/script-src[^;]*'unsafe-inline'/i.test(csp)) {
    fail('DAST-CSP-002', "CSP script-src must not allow 'unsafe-inline'");
  }
}

for (const filename of readdirSync(resolve(process.cwd(), 'docs')).filter((name) => name.endsWith('.html'))) {
  const html = readFileSync(resolve(process.cwd(), 'docs', filename), 'utf8');
  const inspection = inspectHtml(html);
  if (inspection.eventHandlers.length) {
    fail('DAST-CSP-003', `${filename} contains an inline event handler`);
  }
  if (inspection.styleElements.length) {
    fail('DAST-CSP-004', `${filename} contains an inline style element`);
  }
  if (inspection.styleAttributes.length) {
    fail('DAST-CSP-004', `${filename} contains inline style attributes`);
  }

  for (const script of inspection.scripts) {
    if (script.hasSrc) continue;
    if (script.type !== 'application/ld+json') {
      fail('DAST-CSP-003', `${filename} contains an executable inline script`);
      continue;
    }

    const hash = `'sha256-${createHash('sha256').update(script.body).digest('base64')}'`;
    if (!csp.includes(hash)) {
      fail('DAST-CSP-003', `${filename} JSON-LD hash is missing from CSP: ${hash}`);
    }
  }
}

async function checkLiveSite() {
  const baseUrl = process.env.DAST_BASE_URL;
  if (!baseUrl) return;
  let url;
  try {
    url = new URL(baseUrl);
  } catch {
    fail('DAST-LIVE-000', `DAST_BASE_URL is not a valid URL: ${baseUrl}`);
    return;
  }
  if (!['https:', 'http:'].includes(url.protocol)) {
    fail('DAST-LIVE-000', `DAST_BASE_URL must use http or https: ${baseUrl}`);
    return;
  }

  try {
    for (const path of ['/', '/shared.css?v=20260827', '/shared.js?v=20260827']) {
      const target = new URL(path, url.origin);
      const response = await fetch(target, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) fail('DAST-LIVE-001', `GET ${target.href} returned HTTP ${response.status}`);
      for (const [name, expected] of requiredHeaders) {
        const value = response.headers.get(name) || '';
        if (!value) fail('DAST-LIVE-001', `Live ${target.pathname} missing ${name}`);
        else if (!expected.test(value)) fail('DAST-LIVE-001', `Live ${target.pathname} ${name} does not meet baseline: ${value}`);
      }
    }
    console.log(`Security DAST live target checked: ${url.href}`);
  } catch (error) {
    fail('DAST-LIVE-002', `Live DAST request failed for ${url.href}: ${error instanceof Error ? error.message : 'unknown error'}`);
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
