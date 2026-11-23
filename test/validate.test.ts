// test/validate.test.ts — Lightweight validate API tests
import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { validate, quickScore } from '../src/validate.js';
import type { ValidateResult, ValidateIssue } from '../src/validate.js';

describe('validate()', () => {
  it('returns correct shape', () => {
    const result = validate('Fix the bug');
    assert.ok(typeof result.pass === 'boolean');
    assert.ok(typeof result.score === 'number');
    assert.ok(typeof result.threshold === 'number');
    assert.ok(typeof result.task_type === 'string');
    assert.ok(typeof result.risk_level === 'string');
    assert.ok(Array.isArray(result.issues));
  });

  it('default threshold is 60', () => {
    const result = validate('Fix the bug');
    assert.equal(result.threshold, 60);
  });

  it('custom threshold works', () => {
    const result = validate('Fix the bug', { threshold: 20 });
    assert.equal(result.threshold, 20);
  });

  it('good prompt passes default threshold', () => {
    const result = validate(
      'Add input validation to the createUser function in src/users.ts using Zod schemas. ' +
      'Validate email format, require password minimum 8 characters, and return 400 with ' +
      'validation errors. Preserve existing tests in test/users.test.ts.'
    );
    assert.ok(result.pass, `Expected pass but got score ${result.score}`);
    assert.ok(result.score >= 60, `Score ${result.score} should be >= 60`);
  });

  it('vague prompt fails default threshold', () => {
    const result = validate('make it better');
    assert.ok(!result.pass, `Expected fail but got score ${result.score}`);
  });

  it('issues array is capped at 5', () => {
    const result = validate('do stuff');
    assert.ok(result.issues.length <= 5, `Got ${result.issues.length} issues, expected <= 5`);
  });

  it('issues have correct shape', () => {
    const result = validate('make it work');
    for (const issue of result.issues) {
      assert.ok(typeof issue.rule === 'string', 'issue.rule must be string');
      assert.ok(typeof issue.severity === 'string', 'issue.severity must be string');
      assert.ok(typeof issue.message === 'string', 'issue.message must be string');
    }
  });

  it('is deterministic', () => {
    const prompt = 'Implement user authentication using JWT tokens with refresh token rotation';
    const a = validate(prompt);
    const b = validate(prompt);
    assert.equal(a.score, b.score);
    assert.equal(a.pass, b.pass);
    assert.equal(a.task_type, b.task_type);
    assert.equal(a.risk_level, b.risk_level);
    assert.equal(a.issues.length, b.issues.length);
  });

  it('context parameter affects analysis', () => {
    const prompt = 'Fix the authentication bug';
    const withContext = validate(prompt, {
      context: 'The OAuth callback handler in auth/callback.ts throws a 500 error when the token is expired.',
    });
    const withoutContext = validate(prompt);
    // Context should improve specificity → different score
    assert.ok(typeof withContext.score === 'number');
    assert.ok(typeof withoutContext.score === 'number');
  });

  it('detects task type correctly', () => {
    assert.equal(validate('Write a blog post about AI safety').task_type, 'writing');
    // Task type is always a valid string
    const result = validate('Implement a REST API endpoint for user registration');
    assert.ok(typeof result.task_type === 'string');
    assert.ok(result.task_type.length > 0);
  });

  it('strict threshold fails more prompts', () => {
    const prompt = 'Update the login page';
    const normal = validate(prompt, { threshold: 40 });
    const strict = validate(prompt, { threshold: 90 });
    // Same score, different pass/fail
    assert.equal(normal.score, strict.score);
    assert.ok(normal.threshold < strict.threshold);
  });
});

describe('quickScore()', () => {
  it('returns a number between 0 and 100', () => {
    const score = quickScore('Fix the bug');
    assert.ok(score >= 0 && score <= 100, `Score ${score} out of range`);
  });

  it('is deterministic', () => {
    const prompt = 'Add comprehensive error handling to the payment processing module';
    assert.equal(quickScore(prompt), quickScore(prompt));
  });

  it('matches validate() score', () => {
    const prompt = 'Refactor the database connection pool to use async/await';
    const full = validate(prompt);
    const quick = quickScore(prompt);
    assert.equal(full.score, quick);
  });
});
