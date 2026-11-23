// test/benchmark.test.ts — Benchmark dataset regression guard
import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { analyzePrompt, detectTaskType, scorePrompt } from '../src/api.js';

const __test_dirname = dirname(fileURLToPath(import.meta.url));
const benchPath = resolve(__test_dirname, '..', '..', 'benchmarks', 'prompts.json');

interface BenchmarkPrompt {
  id: string;
  category: string;
  difficulty: string;
  prompt: string;
  description: string;
  expected_score: number;
  expected_risk_level: string;
  expected_task_type: string;
}

interface BenchmarkData {
  schema_version: number;
  benchmark_version: string;
  score_tolerance: number;
  prompts: BenchmarkPrompt[];
}

const data: BenchmarkData = JSON.parse(readFileSync(benchPath, 'utf-8'));

describe('benchmark dataset', () => {
  it('has valid schema', () => {
    assert.equal(data.schema_version, 1);
    assert.ok(data.benchmark_version);
    assert.ok(typeof data.score_tolerance === 'number');
    assert.ok(Array.isArray(data.prompts));
    assert.ok(data.prompts.length >= 10, `Expected >= 10 prompts, got ${data.prompts.length}`);
  });

  it('all prompts have required fields', () => {
    for (const p of data.prompts) {
      assert.ok(p.id, `Missing id`);
      assert.ok(p.category, `${p.id}: missing category`);
      assert.ok(p.prompt, `${p.id}: missing prompt`);
      assert.ok(typeof p.expected_score === 'number', `${p.id}: expected_score must be number`);
      assert.ok(p.expected_risk_level, `${p.id}: missing expected_risk_level`);
      assert.ok(p.expected_task_type, `${p.id}: missing expected_task_type`);
    }
  });

  it('all IDs are unique', () => {
    const ids = data.prompts.map(p => p.id);
    assert.equal(ids.length, new Set(ids).size, 'Duplicate benchmark IDs found');
  });

  it('scores are within tolerance of expected', () => {
    const tolerance = data.score_tolerance;
    for (const p of data.prompts) {
      const intent = analyzePrompt(p.prompt);
      const quality = scorePrompt(intent);
      const diff = Math.abs(quality.total - p.expected_score);
      assert.ok(
        diff <= tolerance,
        `${p.id}: score ${quality.total} differs from expected ${p.expected_score} by ${diff} (tolerance: ${tolerance})`,
      );
    }
  });

  it('risk levels match expected', () => {
    for (const p of data.prompts) {
      const intent = analyzePrompt(p.prompt);
      assert.equal(
        intent.risk_level, p.expected_risk_level,
        `${p.id}: risk ${intent.risk_level} !== expected ${p.expected_risk_level}`,
      );
    }
  });

  it('task types match expected', () => {
    for (const p of data.prompts) {
      const taskType = detectTaskType(p.prompt);
      assert.equal(
        taskType, p.expected_task_type,
        `${p.id}: task_type ${taskType} !== expected ${p.expected_task_type}`,
      );
    }
  });

  it('score distribution is non-degenerate', () => {
    const scores = data.prompts.map(p => p.expected_score);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    assert.ok(min < 50, `Min score ${min} should be < 50 (need poor prompts)`);
    assert.ok(max > 60, `Max score ${max} should be > 60 (need good prompts)`);
  });
});

describe('pcp benchmark CLI', () => {
  const pcpBin = resolve(__test_dirname, '..', '..', 'bin', 'pcp.js');

  it('--json returns valid envelope', () => {
    const out = execFileSync('node', [pcpBin, 'benchmark', '--json'], { encoding: 'utf-8' });
    const result = JSON.parse(out);
    assert.ok(result.request_id, 'Missing request_id');
    assert.ok(result.version, 'Missing version');
    assert.equal(result.subcommand, 'benchmark');
    assert.ok(result.benchmark_version, 'Missing benchmark_version');
    assert.ok(typeof result.total === 'number');
    assert.ok(typeof result.passed === 'number');
    assert.ok(typeof result.regressions === 'number');
    assert.ok(Array.isArray(result.results));
  });

  it('human output includes table', () => {
    const out = execFileSync('node', [pcpBin, 'benchmark'], { encoding: 'utf-8' });
    assert.ok(out.includes('PCP Benchmark'), 'Missing header');
    assert.ok(out.includes('bench_001'), 'Missing first benchmark ID');
    assert.ok(out.includes('Results:'), 'Missing results summary');
    assert.ok(out.includes('Distribution:'), 'Missing distribution');
  });

  it('exits 0 when no regressions', () => {
    // Should not throw (exit code 0)
    execFileSync('node', [pcpBin, 'benchmark', '--json'], { encoding: 'utf-8' });
  });
});
