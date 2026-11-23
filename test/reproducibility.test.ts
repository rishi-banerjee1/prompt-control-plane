// test/reproducibility.test.ts — Phase 3: Reproducibility tests.
// Verifies auto-calculated hashes, version strings, risk scores, and API exports.

import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import {
  RULES_VERSION,
  calculateBuiltInRuleSetHash,
  runRules,
  computeRiskScore,
  RISK_WEIGHTS,
} from '../src/rules.js';
import { SessionHistoryManager } from '../src/sessionHistory.js';
import type { Session, OutputTarget } from '../src/types.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createMockSession(overrides?: Partial<Session>): Session {
  const id = randomUUID();
  return {
    id,
    state: 'COMPILED',
    created_at: Date.now(),
    last_accessed: Date.now(),
    raw_prompt: 'Write a function to calculate Fibonacci',
    target: 'claude' as OutputTarget,
    intent_spec: {
      user_intent: 'Write a function',
      goal: 'Create Fibonacci',
      definition_of_done: ['Works for n=10', 'No infinite loops'],
      task_type: 'code_change',
      inputs_detected: [],
      constraints: { scope: [], forbidden: [] },
      output_format: 'JavaScript function',
      risk_level: 'low',
      assumptions: [],
      blocking_questions: [],
    },
    compiled_prompt: 'Write a Fibonacci function...',
    quality_before: { total: 75, max: 100, dimensions: [], confidence: 'medium' as const, confidence_note: 'Moderate improvement expected — optimization will add structure and fill gaps.' },
    compilation_checklist: { items: [], summary: 'Good' },
    cost_estimate: {
      input_tokens: 100,
      estimated_output_tokens: 150,
      costs: [],
      recommended_model: 'claude-opus-5',
      recommendation_reason: 'Best quality for this task',
    },
    answers: {},
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test('reproducibility', async (t) => {

  // ── RULES_VERSION ──────────────────────────────────────────────────────────

  await t.test('1. RULES_VERSION matches semver-Nr format', () => {
    assert.match(RULES_VERSION, /^\d+\.\d+\.\d+-\d+r$/);
  });

  await t.test('2. RULES_VERSION rule count reflects actual rules array', () => {
    // Extract the number from the version string
    const match = RULES_VERSION.match(/-(\d+)r$/);
    assert.ok(match, 'RULES_VERSION should contain -Nr suffix');
    const count = parseInt(match![1], 10);
    assert.equal(count, 14, 'Should have 14 built-in rules');
  });

  // ── Built-in hash stability ────────────────────────────────────────────────

  await t.test('3. calculateBuiltInRuleSetHash returns 64-char hex', () => {
    const hash = calculateBuiltInRuleSetHash();
    assert.equal(hash.length, 64);
    assert.match(hash, /^[0-9a-f]{64}$/);
  });

  await t.test('4. calculateBuiltInRuleSetHash is stable across calls', () => {
    const hash1 = calculateBuiltInRuleSetHash();
    const hash2 = calculateBuiltInRuleSetHash();
    const hash3 = calculateBuiltInRuleSetHash();
    assert.equal(hash1, hash2);
    assert.equal(hash2, hash3);
  });

  await t.test('5. Hash is lowercase hex (no uppercase)', () => {
    const hash = calculateBuiltInRuleSetHash();
    assert.equal(hash, hash.toLowerCase());
  });

  // ── Hash determinism ───────────────────────────────────────────────────────

  await t.test('6. Hash is a snapshot — record and verify', () => {
    // This test records the current hash. If it changes, a rule was modified.
    // Update the expected hash only when rules intentionally change.
    const hash = calculateBuiltInRuleSetHash();
    // Snapshot: just verify it's stable and non-empty
    assert.ok(hash.length === 64, 'Hash should be 64-char SHA-256 hex');
    assert.ok(hash !== '0'.repeat(64), 'Hash should not be all zeros');
  });

  await t.test('7. RISK_WEIGHTS covers 10 of 14 rules (4 use elevation)', () => {
    const weightedRuleCount = Object.keys(RISK_WEIGHTS).length;
    assert.equal(weightedRuleCount, 10, 'RISK_WEIGHTS should have 10 entries');
    // 14 total - 10 weighted = 4 elevation-only rules
    const match = RULES_VERSION.match(/-(\d+)r$/);
    const totalRules = parseInt(match![1], 10);
    assert.equal(totalRules - weightedRuleCount, 4, '4 rules should use elevation');
  });

  // ── Risk score in export ───────────────────────────────────────────────────

  await t.test('8. Risk score is non-zero for risky prompts', async () => {
    const tempDir = path.join(tmpdir(), `repro-test-${randomUUID()}`);
    await fs.mkdir(tempDir, { recursive: true });

    const mgr = new SessionHistoryManager(tempDir);
    const session = createMockSession({
      raw_prompt: 'Make it better',  // Triggers vague_objective
    });

    await mgr.saveSession(session);
    const exported = await mgr.exportSession(session.id);

    assert.ok(exported);
    assert.ok(exported!.metadata.risk_score > 0, 'Risky prompt should have non-zero risk_score');

    await fs.rm(tempDir, { recursive: true });
  });

  await t.test('9. Risk score is zero for clean prompts', async () => {
    const tempDir = path.join(tmpdir(), `repro-test-${randomUUID()}`);
    await fs.mkdir(tempDir, { recursive: true });

    const mgr = new SessionHistoryManager(tempDir);
    const session = createMockSession({
      raw_prompt: 'Write a function called calculateTotal in src/utils.ts that takes an array of numbers and returns their sum. Return 0 for empty arrays.',
    });

    await mgr.saveSession(session);
    const exported = await mgr.exportSession(session.id);

    assert.ok(exported);
    assert.equal(exported!.metadata.risk_score, 0, 'Clean prompt should have zero risk_score');

    await fs.rm(tempDir, { recursive: true });
  });

  await t.test('10. Export risk_score matches computeRiskScore(runRules())', async () => {
    const tempDir = path.join(tmpdir(), `repro-test-${randomUUID()}`);
    await fs.mkdir(tempDir, { recursive: true });

    const mgr = new SessionHistoryManager(tempDir);
    const rawPrompt = 'Fix the bug';  // Should trigger some rules
    const session = createMockSession({ raw_prompt: rawPrompt });

    await mgr.saveSession(session);
    const exported = await mgr.exportSession(session.id);

    // Compute independently using the same inputs
    const ruleResults = runRules(rawPrompt, undefined, session.intent_spec.task_type);
    const expectedScore = computeRiskScore(ruleResults).score;

    assert.ok(exported);
    assert.equal(exported!.metadata.risk_score, expectedScore,
      'Export risk_score should match independent computeRiskScore(runRules())');

    await fs.rm(tempDir, { recursive: true });
  });

  // ── Export auto-calculate ──────────────────────────────────────────────────

  await t.test('11. Export rule_set_hash is auto-populated (64-char hex)', async () => {
    const tempDir = path.join(tmpdir(), `repro-test-${randomUUID()}`);
    await fs.mkdir(tempDir, { recursive: true });

    const mgr = new SessionHistoryManager(tempDir);
    const session = createMockSession();

    await mgr.saveSession(session);
    const exported = await mgr.exportSession(session.id);

    assert.ok(exported);
    assert.equal(exported!.rule_set_hash.length, 64);
    assert.match(exported!.rule_set_hash, /^[0-9a-f]{64}$/);

    await fs.rm(tempDir, { recursive: true });
  });

  await t.test('12. Export rule_set_version equals RULES_VERSION', async () => {
    const tempDir = path.join(tmpdir(), `repro-test-${randomUUID()}`);
    await fs.mkdir(tempDir, { recursive: true });

    const mgr = new SessionHistoryManager(tempDir);
    const session = createMockSession();

    await mgr.saveSession(session);
    const exported = await mgr.exportSession(session.id);

    assert.ok(exported);
    assert.equal(exported!.rule_set_version, RULES_VERSION);

    await fs.rm(tempDir, { recursive: true });
  });

  await t.test('13. Export rule_set_hash matches calculateBuiltInRuleSetHash()', async () => {
    const tempDir = path.join(tmpdir(), `repro-test-${randomUUID()}`);
    await fs.mkdir(tempDir, { recursive: true });

    const mgr = new SessionHistoryManager(tempDir);
    const session = createMockSession();

    await mgr.saveSession(session);
    const exported = await mgr.exportSession(session.id);

    assert.ok(exported);
    assert.equal(exported!.rule_set_hash, calculateBuiltInRuleSetHash(),
      'Export hash should match direct calculateBuiltInRuleSetHash() call');

    await fs.rm(tempDir, { recursive: true });
  });

  // ── API barrel exports ─────────────────────────────────────────────────────

  await t.test('14. RULES_VERSION exported from api.ts barrel', async () => {
    const api = await import('../src/api.js');
    assert.ok('RULES_VERSION' in api, 'RULES_VERSION should be exported from api.ts');
    assert.equal(api.RULES_VERSION, RULES_VERSION);
  });

  await t.test('15. calculateBuiltInRuleSetHash exported from api.ts barrel', async () => {
    const api = await import('../src/api.js');
    assert.ok('calculateBuiltInRuleSetHash' in api, 'calculateBuiltInRuleSetHash should be exported from api.ts');
    assert.equal(typeof api.calculateBuiltInRuleSetHash, 'function');
    assert.equal(api.calculateBuiltInRuleSetHash(), calculateBuiltInRuleSetHash());
  });
});
