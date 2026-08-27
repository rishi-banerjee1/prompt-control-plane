import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectHtml } from './html-security.mjs';

test('parses malformed script closing tags without a regex bypass', () => {
  const result = inspectHtml('<script>danger()</script\t\n bar>');
  assert.equal(result.scripts.length, 1);
  assert.equal(result.scripts[0].body, 'danger()');
  assert.equal(result.scripts[0].hasSrc, false);
});

test('normalizes script attributes and preserves JSON-LD bytes', () => {
  const body = '\n{"name":"PCP"}\n';
  const result = inspectHtml(`<script TYPE="application/ld+json">${body}</script>`);
  assert.equal(result.scripts[0].type, 'application/ld+json');
  assert.equal(result.scripts[0].body, body);
});

test('distinguishes external scripts and reports inline event handlers', () => {
  const result = inspectHtml('<button ONCLICK="run()">Run</button><script SRC="app.js"></script>');
  assert.equal(result.eventHandlers[0].name, 'onclick');
  assert.equal(result.scripts[0].hasSrc, true);
});

test('reports inline style elements and style attributes', () => {
  const result = inspectHtml('<style>.x{color:red}</style><div style="color:red"></div>');
  assert.equal(result.styleElements.length, 1);
  assert.equal(result.styleAttributes.length, 1);
});
