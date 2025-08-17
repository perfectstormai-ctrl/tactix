import test from 'node:test';
import assert from 'node:assert';
import { register, lookup } from '../src/registry.js';

test('register and lookup', () => {
  register({ serverId: 'abc', url: 'https://example.com', fingerprint: 'fp', signedRecord: 'sig' });
  const found = lookup('abc');
  assert.ok(found && found.url === 'https://example.com');
});
