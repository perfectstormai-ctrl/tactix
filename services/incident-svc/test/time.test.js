const { test } = require('node:test');
const assert = require('node:assert');
const { durationHours, clampToHorizon } = require('../dist/lib/time.js');

test('durationHours computes whole and fractional hours', () => {
  const start = '2025-08-17T10:00:00Z';
  const end = '2025-08-18T10:00:00Z';
  assert.strictEqual(durationHours(start, end), 24);
  const end2 = '2025-08-17T11:30:00Z';
  assert.strictEqual(durationHours(start, end2), 1.5);
});

test('clampToHorizon enforces bounds around now', () => {
  const now = new Date('2025-01-01T00:00:00Z');
  const horizon = 30;
  const past = new Date('2024-11-30T00:00:00Z');
  const future = new Date('2025-02-15T00:00:00Z');
  const within = new Date('2025-01-10T00:00:00Z');
  assert.deepStrictEqual(clampToHorizon(past, horizon, now), new Date('2024-12-02T00:00:00.000Z'));
  assert.deepStrictEqual(clampToHorizon(within, horizon, now), within);
  assert.deepStrictEqual(clampToHorizon(future, horizon, now), new Date('2025-01-31T00:00:00.000Z'));
});
