const { test } = require('node:test');
const assert = require('node:assert');
const { createServer, setClient } = require('../dist/index.js');

class FakeClient {
  constructor(rows) {
    this.rows = rows;
  }
  async connect() {}
  async query(sql, params) {
    let rows = this.rows.slice();
    if (params.length === 2) {
      const needle = params[0].slice(1, -1).toLowerCase();
      rows = rows.filter(
        (r) =>
          r.title.toLowerCase().includes(needle) ||
          (r.description ?? '').toLowerCase().includes(needle)
      );
    }
    return { rows };
  }
}

test('GET /incidents?q=fire returns seeded incident', async () => {
  const client = new FakeClient([
    {
      id: 1,
      title: 'Fire in the hole',
      description: 'fire drill',
      severity: 'high',
      status: 'open',
      comments: [],
      createdAt: new Date(),
    },
  ]);

  setClient(client);

  const server = createServer().listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;

  const res = await fetch(`${base}/incidents?q=fire`);
  assert.strictEqual(res.status, 200);
  const list = await res.json();
  assert.strictEqual(list.length, 1);
  assert.equal(list[0].title, 'Fire in the hole');

  server.close();
});
