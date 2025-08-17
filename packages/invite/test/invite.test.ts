import test from 'node:test';
import assert from 'node:assert';
import { generateInvite, verifyInvite, decodeInvite } from '../src/index.js';

const secret = 's3cr3t';

test('generate and verify invite', () => {
  const code = generateInvite('srv1', secret, 60);
  const valid = verifyInvite(code, secret);
  assert.ok(valid && valid.serverId === 'srv1');
});

test('decode invite without secret', () => {
  const code = generateInvite('srv2', secret, 60);
  const decoded = decodeInvite(code);
  assert.strictEqual(decoded?.serverId, 'srv2');
});
