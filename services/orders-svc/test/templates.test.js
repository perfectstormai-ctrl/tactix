const { test } = require('node:test');
const assert = require('node:assert');
const { loadTemplates } = require('../dist/templates.js');

test('loadTemplates returns templates', () => {
  const templates = loadTemplates();
  assert.ok(Array.isArray(templates) && templates.length > 0);
});
