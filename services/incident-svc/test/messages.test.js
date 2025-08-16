const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { newDb } = require('pg-mem');
const { runMigrations } = require('@tactix/lib-db');
const { createServer, setClient } = require('../dist/index.js');

async function setupDb() {
  const db = newDb();
  const pg = db.adapters.createPg();
  const client = new pg.Client();
  await client.connect();
  await runMigrations(client, path.join(__dirname, '../migrations/up'));
  return client;
}

test('message lifecycle', async () => {
  const client = await setupDb();
  const opId = '11111111-1111-1111-1111-111111111111';
  await client.query('INSERT INTO operations (operation_id, code, title) VALUES ($1,$2,$3)', [opId, 'OPX', 'Op X']);
  await client.query('INSERT INTO org_units (org_unit_id, operation_id, scope, unit_name, xmpp_jid) VALUES ($1,$2,$3,$4,$5)', [
    '22222222-2222-2222-2222-222222222222',
    opId,
    'HIGHER',
    'Battalion HQ',
    'jid:hq'
  ]);
  setClient(client);

  const token = Buffer.from(JSON.stringify({ sub: 'user1' })).toString('base64');
  const server = createServer().listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;

  let res = await fetch(`${base}/operations/${opId}/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ recipientScope: 'HIGHER', recipientUnit: 'Battalion HQ', content: 'Hello' })
  });
  assert.equal(res.status, 201);
  const draft = await res.json();

  res = await fetch(`${base}/operations/${opId}/messages?status=DRAFT`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const drafts = await res.json();
  assert.equal(drafts.length, 1);

  res = await fetch(`${base}/operations/${opId}/messages/${draft.message_id}/submit`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(res.status, 200);
  const submitted = await res.json();
  assert.equal(submitted.status, 'SUBMITTED');

  res = await fetch(`${base}/operations/${opId}/messages`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const msgs = await res.json();
  assert.equal(msgs.length, 1);

  server.close();
});
