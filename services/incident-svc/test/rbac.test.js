const { test } = require('node:test');
const assert = require('node:assert');
const { effective, can } = require('../dist/rbac/effective.js');

test('effective permissions from AD groups', () => {
  const op = 'OP1';
  const result = effective(
    { upn: 'a', ad_groups: ['OP1_READ'] },
    op,
    []
  );
  assert.ok(result.roles.has('VIEWER'));
});

test('db grant editor escalates viewer', () => {
  const op = 'OP2';
  const result = effective(
    { upn: 'b', ad_groups: [] },
    op,
    [{ user_upn: 'b', role: 'EDITOR' }]
  );
  assert.ok(result.roles.has('EDITOR'));
  assert.ok(result.roles.has('VIEWER'));
});

test('imo can assign', () => {
  const op = 'OP3';
  const result = effective(
    { upn: 'c', ad_groups: [] },
    op,
    [{ user_upn: 'c', role: 'IMO' }]
  );
  assert.ok(can(result.roles, 'ASSIGN'));
});

test('removing grant falls back to ad viewer', () => {
  const op = 'OP4';
  const withGrant = effective(
    { upn: 'd', ad_groups: ['OP4_READ'] },
    op,
    [{ user_upn: 'd', role: 'EDITOR' }]
  );
  assert.ok(withGrant.roles.has('EDITOR'));
  const removed = effective(
    { upn: 'd', ad_groups: ['OP4_READ'] },
    op,
    []
  );
  assert.ok(!removed.roles.has('EDITOR'));
  assert.ok(removed.roles.has('VIEWER'));
});
