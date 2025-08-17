const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { newDb } = require('pg-mem');
const { runMigrations } = require('@tactix/lib-db');
const { saveDraft, submitMessage } = require('../dist/incidents/messages.js');

async function setupDb() {
  const db = newDb();
  const pg = db.adapters.createPg();
  const client = new pg.Client();
  await client.connect();
  await runMigrations(client, path.join(__dirname, '../migrations/up'));
  return client;
}

test('saveDraft and submitMessage', async () => {
  const client = await setupDb();
  await client.query("INSERT INTO users (id, email) VALUES (1,'u1@example.com')");
  const incident = (
    await client.query('INSERT INTO incidents (user_id, title, severity) VALUES (1,$1,$2) RETURNING id', [
      'Test',
      'info'
    ])
  ).rows[0];

  const draft = await saveDraft(client, incident.id, 'Hello', 'user1');
  assert.equal(draft.status, 'draft');

  const submitted = await submitMessage(client, incident.id, draft.id);
  assert.ok(submitted);
  assert.equal(submitted.status, 'submitted');
});
