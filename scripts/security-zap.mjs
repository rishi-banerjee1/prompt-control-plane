#!/usr/bin/env node
import { mkdir } from 'node:fs/promises';
import { chmodSync, mkdtempSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';

const root = process.cwd();
const isCi = process.env.CI === '1' || process.env.CI === 'true';
const configuredTarget = process.env.ZAP_BASE_URL || '';
const zapImage = process.env.ZAP_DOCKER_IMAGE || 'ghcr.io/zaproxy/zaproxy:stable';
const ciReportDir = resolve(root, 'zap-reports');
const findings = [];
const warnings = [];

function fail(rule, message) {
  findings.push({ rule, message });
}

function warn(rule, message) {
  warnings.push({ rule, message });
}

function run(command, args, options = {}) {
  return new Promise((resolveRun) => {
    const child = spawn(command, args, {
      ...options,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', error => resolveRun({ status: null, stdout, stderr: `${stderr}${error.message}` }));
    child.on('close', status => resolveRun({ status, stdout, stderr }));
  });
}

async function dockerAvailable() {
  const result = await run('docker', ['--version']);
  return result.status === 0;
}

function collectAlerts(report) {
  const sites = Array.isArray(report?.site) ? report.site : [];
  const alerts = [];
  for (const site of sites) {
    for (const alert of Array.isArray(site.alerts) ? site.alerts : []) {
      alerts.push(alert);
    }
  }
  return alerts;
}

function riskOf(alert) {
  const risk = String(alert.riskdesc || alert.risk || '').split('(')[0].trim().toLowerCase();
  if (risk.includes('high')) return 'high';
  if (risk.includes('medium')) return 'medium';
  if (risk.includes('low')) return 'low';
  if (risk.includes('informational')) return 'informational';
  return 'unknown';
}

function alertPaths(alert) {
  const instances = Array.isArray(alert.instances) ? alert.instances : [];
  return instances.map((instance) => {
    try {
      return new URL(instance.uri).pathname;
    } catch {
      return '';
    }
  }).filter(Boolean);
}

function isExplicitZapException(alert) {
  const name = String(alert.alert || '').trim();
  const paths = alertPaths(alert);
  return name === 'Cross-Domain Misconfiguration' && paths.length > 0 && paths.every(path => path === '/robots.txt');
}

function validateTarget(rawTarget) {
  if (!rawTarget) return '';
  let url;
  try {
    url = new URL(rawTarget);
  } catch {
    fail('ZAP-RUN-000', `ZAP_BASE_URL is not a valid URL: ${rawTarget}`);
    return '';
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    fail('ZAP-RUN-000', `ZAP_BASE_URL must use http or https: ${rawTarget}`);
    return '';
  }
  return url.href;
}

const target = validateTarget(configuredTarget);

if (!target && !isCi) {
  console.log('Security ZAP skipped: set ZAP_BASE_URL to scan a live target.');
  process.exit(0);
}

try {
  if (!target) fail('ZAP-RUN-002', 'ZAP_BASE_URL is required for CI ZAP scans');

  if (!(await dockerAvailable())) {
    fail('ZAP-RUN-001', 'Docker is required for the ZAP baseline scan and was not available');
  }

  if (!findings.length) {
    const reportDir = isCi ? ciReportDir : mkdtempSync(join(tmpdir(), 'pcp-zap-'));
    await mkdir(reportDir, { recursive: true });
    chmodSync(reportDir, 0o777);
    const args = [
      'run',
      '--rm',
      '--network',
      'host',
      '-v',
      `${reportDir}:/zap/wrk:rw`,
      zapImage,
      'zap-baseline.py',
      '-t',
      target,
      '-J',
      'zap-report.json',
      '-w',
      'zap-report.md',
      '-r',
      'zap-report.html',
      '-x',
      'zap-report.xml',
      '-m',
      process.env.ZAP_MINUTES || '3',
      '-T',
      process.env.ZAP_TIMEOUT_MINUTES || '10',
    ];

    const result = await run('docker', args);
    if (result.stdout.trim()) console.log(result.stdout.trim());
    if (result.stderr.trim()) console.error(result.stderr.trim());
    if (result.status === null || result.status === 1 || result.status === 3 || result.status > 3) {
      fail('ZAP-RUN-003', `ZAP baseline exited ${result.status}; reports are in ${reportDir}`);
    } else if (result.status === 2) {
      warn('ZAP-RUN-002', `ZAP baseline reported warnings; enforcing parsed alert risks from ${reportDir}`);
    }

    const jsonPath = join(reportDir, 'zap-report.json');
    let report;
    try {
      report = JSON.parse(await import('node:fs/promises').then(fs => fs.readFile(jsonPath, 'utf8')));
    } catch (error) {
      fail('ZAP-RUN-004', `ZAP JSON report missing or invalid at ${jsonPath}: ${error instanceof Error ? error.message : 'unknown error'}`);
    }

    if (report) {
      const alerts = collectAlerts(report);
      const blockingAlerts = alerts.filter(alert => ['high', 'medium', 'low', 'unknown'].includes(riskOf(alert)));
      const informationalAlerts = alerts.filter(alert => riskOf(alert) === 'informational');
      for (const alert of informationalAlerts) warn('ZAP-INFO-001', `${alert.alert || 'Informational alert'} (${alert.riskdesc || 'Informational'})`);
      for (const alert of blockingAlerts) {
        if (isExplicitZapException(alert)) {
          warn('ZAP-ALLOWLIST-001', `${alert.alert || 'Unnamed alert'} limited to public /robots.txt (${alert.riskdesc || 'unknown risk'})`);
          continue;
        }
        fail('ZAP-ALERT-001', `${alert.alert || 'Unnamed alert'} (${alert.riskdesc || 'unknown risk'})`);
      }
      console.log(`Security ZAP target checked: ${target}`);
      console.log(`Security ZAP reports: ${reportDir}`);
    }
  }
} catch (error) {
  fail('ZAP-RUN-999', error instanceof Error ? error.message : 'Unknown ZAP runner failure');
}

if (warnings.length) {
  console.log('Security ZAP warnings:');
  for (const warning of warnings) console.log(`- ${warning.rule} ${warning.message}`);
}

if (findings.length) {
  console.error('Security ZAP findings:');
  for (const finding of findings) console.error(`- ${finding.rule} ${finding.message}`);
  process.exit(1);
}

console.log(`Security ZAP passed (${warnings.length} warning${warnings.length === 1 ? '' : 's'}).`);
