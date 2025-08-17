const test = require('node:test');
const assert = require('node:assert');
const { once } = require('node:events');

process.env.PORT = 0;
const { server } = require('./index.js');
const ready = once(server, 'listening');

test('GET /health', async () => {
  await ready;
  const port = server.address().port;
  const res = await fetch(`http://127.0.0.1:${port}/health`);
  assert.strictEqual(res.status, 200);
  const json = await res.json();
  assert.strictEqual(json.status, 'ok');
  assert.strictEqual(json.service, process.env.SERVICE_NAME || 'realtime-svc');
  assert.ok(json.ts);
});

test('GET /openapi.json', async () => {
  await ready;
  const port = server.address().port;
  const res = await fetch(`http://127.0.0.1:${port}/openapi.json`);
  assert.strictEqual(res.status, 200);
  const doc = await res.json();
  assert.strictEqual(doc.openapi, '3.0.3');
  assert.strictEqual(doc.info.title, process.env.SERVICE_NAME || 'realtime-svc');
});

test('shutdown', async () => {
  await ready;
  server.close();
});
