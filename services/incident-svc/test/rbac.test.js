const { test } = require('node:test');
const assert = require('node:assert');
const { effective } = require('../dist/rbac/effective.js');
const { createServer, setClient } = require('../dist/index.js');

test('effective permissions rules', () => {
  const op = 'OPNAMEXX-X';
  const u1 = effective(
    { upn: 'a', ad_groups: [`${op}_READ`] },
    op,
    [],
    []
  );
  assert.ok(u1.roles.has('READ'));

  const u2 = effective(
    { upn: 'b', ad_groups: [`${op}_IMO`] },
    op,
    [],
    []
  );
  assert.ok(u2.roles.has('ASSIGN'));
  assert.ok(u2.roles.has('READ'));

  const u3 = effective(
    { upn: 'c', ad_groups: [] },
    op,
    [{ user_upn: 'c', active: true }],
    []
  );
  assert.ok(u3.roles.has('READ'));
});

test('permissions API flow', async () => {
  const operations = [];
  const assignments = [];
  const roleGrants = [];
  const fakeClient = {
    async query(sql, params) {
      if (sql.startsWith('SELECT operation_id FROM operations WHERE code=$1')) {
        const op = operations.find((o) => o.code === params[0]);
        return { rowCount: op ? 1 : 0, rows: op ? [{ operation_id: op.operation_id }] : [] };
      }
      if (sql.startsWith('SELECT operation_id, code, title FROM operations WHERE operation_id=$1')) {
        const op = operations.find((o) => o.operation_id === params[0]);
        return { rowCount: op ? 1 : 0, rows: op ? [op] : [] };
      }
      if (sql.startsWith('SELECT user_upn, active FROM assignments WHERE operation_id=$1 AND user_upn=$2')) {
        const row = assignments.find((a) => a.operation_id === params[0] && a.user_upn === params[1]);
        return { rows: row ? [{ user_upn: row.user_upn, active: row.active }] : [] };
      }
      if (sql.startsWith('SELECT user_upn, role FROM role_grants WHERE operation_id=$1 AND user_upn=$2')) {
        const rows = roleGrants.filter((r) => r.operation_id === params[0] && r.user_upn === params[1]);
        return { rows };
      }
      if (sql.startsWith('SELECT * FROM assignments WHERE operation_id=$1')) {
        const rows = assignments.filter((a) => a.operation_id === params[0]);
        return { rows };
      }
      if (sql.startsWith('SELECT * FROM role_grants WHERE operation_id=$1')) {
        const rows = roleGrants.filter((r) => r.operation_id === params[0]);
        return { rows };
      }
      if (sql.startsWith('SELECT code FROM operations WHERE operation_id=$1')) {
        const op = operations.find((o) => o.operation_id === params[0]);
        return { rowCount: op ? 1 : 0, rows: op ? [{ code: op.code }] : [] };
      }
      if (sql.startsWith('SELECT assignment_id FROM assignments WHERE operation_id=$1 AND user_upn=$2')) {
        const row = assignments.find((a) => a.operation_id === params[0] && a.user_upn === params[1]);
        return { rowCount: row ? 1 : 0, rows: row ? [{ assignment_id: row.assignment_id }] : [] };
      }
      if (sql.startsWith('UPDATE assignments SET position_id=$1, alt_display_name=$2, active=TRUE WHERE assignment_id=$3')) {
        const row = assignments.find((a) => a.assignment_id === params[2]);
        if (row) {
          row.position_id = params[0];
          row.alt_display_name = params[1];
          row.active = true;
        }
        return { rows: [] };
      }
      if (sql.startsWith('SELECT * FROM assignments WHERE assignment_id=$1')) {
        const row = assignments.find((a) => a.assignment_id === params[0]);
        return { rows: row ? [row] : [] };
      }
      if (sql.startsWith('INSERT INTO assignments')) {
        const row = {
          assignment_id: params[0],
          operation_id: params[1],
          user_upn: params[2],
          position_id: params[3],
          alt_display_name: params[4],
          created_by_upn: params[5],
          active: true,
        };
        assignments.push(row);
        return { rows: [row] };
      }
      if (sql.startsWith('UPDATE assignments SET active=FALSE')) {
        const row = assignments.find((a) => a.assignment_id === params[0] && a.operation_id === params[1]);
        if (row)
          row.active = false;
        return { rows: [] };
      }
      if (sql.startsWith('INSERT INTO role_grants')) {
        const existing = roleGrants.find((r) => r.operation_id === params[1] && r.user_upn === params[2] && r.role === params[3]);
        if (existing) {
          existing.created_by_upn = params[4];
          return { rows: [existing] };
        }
        const row = {
          grant_id: params[0],
          operation_id: params[1],
          user_upn: params[2],
          role: params[3],
          created_by_upn: params[4],
        };
        roleGrants.push(row);
        return { rows: [row] };
      }
      throw new Error('Unsupported query: ' + sql);
    },
  };
  const opId = '11111111-1111-1111-1111-111111111111';
  operations.push({ operation_id: opId, code: 'OP1', title: 'Operation 1' });
  setClient(fakeClient);

  const readerToken = Buffer.from(
    JSON.stringify({ sub: 'reader', ad_groups: ['OP1_READ'] })
  ).toString('base64');
  const imoToken = Buffer.from(
    JSON.stringify({ sub: 'imo', ad_groups: ['OP1_IMO'] })
  ).toString('base64');

  const server = createServer().listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;

  let res = await fetch(`${base}/operations/${opId}/permissions`, {
    headers: { Authorization: `Bearer ${readerToken}` },
  });
  assert.equal(res.status, 200);
  let body = await res.json();
  assert.equal(body.canAssign, false);
  assert.ok(!('roleGrants' in body));

  res = await fetch(`${base}/operations/${opId}/assignments`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${readerToken}`,
    },
    body: JSON.stringify({ userUpn: 'reader' }),
  });
  assert.equal(res.status, 403);

  res = await fetch(`${base}/operations/${opId}/assignments`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${imoToken}`,
    },
    body: JSON.stringify({ userUpn: 'reader' }),
  });
  assert.equal(res.status, 201);

  res = await fetch(`${base}/operations/${opId}/roles`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${imoToken}`,
    },
    body: JSON.stringify({ userUpn: 'reader', role: 'WRITE' }),
  });
  assert.equal(res.status, 201);

  res = await fetch(`${base}/operations/${opId}/permissions`, {
    headers: { Authorization: `Bearer ${imoToken}` },
  });
  body = await res.json();
  assert.equal(body.assignments.length, 1);
  assert.equal(body.assignments[0].user_upn, 'reader');
  assert.equal(body.roleGrants.length, 1);
  assert.equal(body.roleGrants[0].role, 'WRITE');

  server.close();
});

