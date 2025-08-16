const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { newDb } = require('pg-mem');
const { runMigrations } = require('@tactix/lib-db');

test('migrations create tables', async () => {
  const db = newDb();
  const { Client } = db.adapters.createPg();
  const client = new Client();
  await client.connect();
  await runMigrations(client, path.join(__dirname, '../migrations/up'));
  const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
  const names = res.rows.map(r => r.table_name);
  assert.ok(names.includes('users'));
  assert.ok(names.includes('incidents'));
  assert.ok(names.includes('incident_events'));
  assert.ok(names.includes('approvals'));
  assert.ok(names.includes('attachments'));
});
