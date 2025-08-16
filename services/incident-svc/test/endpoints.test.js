const { test } = require('node:test');
const assert = require('node:assert');

const jwt = require('jsonwebtoken');
const { generateKeyPairSync } = require('crypto');

// generate key pair for testing before requiring service
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
process.env.JWT_PUBLIC_KEY = publicKey.export({ type: 'pkcs1', format: 'pem' });

const {
  createServer,
  getAttachments,
  getEvents,
  getObject,
} = require('../dist/index.js');

const token = jwt.sign({ sub: 'tester', roles: ['dispatcher'] }, privateKey, {
  algorithm: 'RS256',
  expiresIn: '1h',
});

test('incident endpoints lifecycle', async () => {
  const server = createServer().listen(0);
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  let res = await fetch(`${base}/incidents`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Outage', severity: 'low', description: 'desc' })
  });
  assert.strictEqual(res.status, 201);
  const created = await res.json();
  assert.equal(created.title, 'Outage');
  const id = created.id;

  res = await fetch(`${base}/incidents`);
  let list = await res.json();
  assert.strictEqual(list.length, 1);
  assert.equal(list[0].id, id);

  res = await fetch(`${base}/incidents/${id}`);
  const detail = await res.json();
  assert.equal(detail.id, id);

  res = await fetch(`${base}/incidents/${id}/comment`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ comment: 'hello' })
  });
  assert.strictEqual(res.status, 200);
  const afterComment = await res.json();
  assert.deepEqual(afterComment.comments, ['hello']);

  res = await fetch(`${base}/incidents/${id}/status`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status: 'closed' })
  });
  assert.strictEqual(res.status, 200);
  const afterStatus = await res.json();
  assert.equal(afterStatus.status, 'closed');

  res = await fetch(`${base}/incidents?status=closed&q=Out`);
  list = await res.json();
  assert.strictEqual(list.length, 1);

  const form = new FormData();
  const fileContent = 'hello world';
  form.append('file', new Blob([fileContent]), 'README.md');
  res = await fetch(`${base}/incidents/${id}/attachments`, {
    method: 'POST',
    body: form,
  });
  assert.strictEqual(res.status, 201);
  const attachment = await res.json();
  const allAttachments = getAttachments();
  assert.strictEqual(allAttachments.length, 1);
  assert.equal(allAttachments[0].id, attachment.id);
  assert.equal(getObject(attachment.objectName).toString(), fileContent);
  const event = getEvents().find((e) => e.type === 'ATTACHMENT_ADDED');
  assert.ok(event);
  assert.equal(event.incidentId, id);

  server.close();
});
