const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const express = require('express');
const { newDb } = require('pg-mem');
const { randomUUID } = require('crypto');

process.env.SHIFT_MAX_HOURS = '48';
process.env.ALLOW_OVERSIZE_SHIFTS = 'false';
process.env.SCHEDULE_HORIZON_DAYS = '365';

const svc = require('../dist/services/schedule.service.js');
const { createScheduleRouter } = require('../dist/routes/schedule.routes.js');

async function setupDb() {
  const db = newDb();
  db.public.registerFunction({ name: 'gen_random_uuid', returns: 'uuid', implementation: () => randomUUID() });
  const pg = db.adapters.createPg();
  const client = new pg.Client();
  await client.connect();
  await client.query(`CREATE TABLE operations (
    operation_id UUID PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
  );`);
  await client.query(`CREATE TABLE cp_roster (
    roster_id UUID PRIMARY KEY,
    operation_id UUID NOT NULL REFERENCES operations(operation_id) ON DELETE CASCADE,
    user_upn TEXT NOT NULL,
    role TEXT NOT NULL,
    display_name TEXT,
    alt_name TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(operation_id, user_upn, role)
  );`);
  await client.query('CREATE INDEX ix_cp_roster_op_role ON cp_roster(operation_id, role);');
  await client.query(`CREATE TABLE cp_shifts (
    shift_id UUID PRIMARY KEY,
    operation_id UUID NOT NULL REFERENCES operations(operation_id) ON DELETE CASCADE,
    user_upn TEXT NOT NULL,
    role TEXT NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual',
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (ends_at > starts_at)
  );`);
  await client.query('CREATE INDEX ix_cp_shifts_op_window ON cp_shifts(operation_id, starts_at, ends_at);');
  const opId = '00000000-0000-0000-0000-000000000001';
  await client.query("INSERT INTO operations(operation_id, code, title) VALUES ($1,$2,$3)", [opId, 'OP1', 'Test']);
  return { client, opId };
}

async function addRoster(client, opId) {
  await client.query(
    `INSERT INTO cp_roster(roster_id, operation_id, user_upn, role, display_name)
     VALUES ($1,$2,$3,$4,$5)`,
    [randomUUID(), opId, 'user1', 'IMO', 'User One']
  );
}

test('create 24h shift passes within max hours', async () => {
  const { client, opId } = await setupDb();
  await addRoster(client, opId);
  const start = '2025-08-17T10:00:00Z';
  const end = '2025-08-18T10:00:00Z';
  const shift = await svc.createShift(client, opId, { userUpn: 'user1', role: 'IMO', startsAt: start, endsAt: end }, 'tester');
  assert.ok(shift.shiftId);
});

test('overlap detection returns 409 with conflictingShiftId', async () => {
  const { client, opId } = await setupDb();
  await addRoster(client, opId);
  const start = '2025-08-17T10:00:00Z';
  const end = '2025-08-17T14:00:00Z';
  await svc.createShift(client, opId, { userUpn: 'user1', role: 'IMO', startsAt: start, endsAt: end }, 'tester');
  await assert.rejects(
    () => svc.createShift(client, opId, { userUpn: 'user1', role: 'IMO', startsAt: '2025-08-17T13:00:00Z', endsAt: '2025-08-17T15:00:00Z' }, 'tester'),
    (err) => err.status === 409 && err.body.code === 'overlap' && Boolean(err.body.conflictingShiftId)
  );
});

test('POST without roster membership yields 400 not_in_roster', async () => {
  const { client, opId } = await setupDb();
  const app = express();
  app.use('/operations/:opId/schedule', createScheduleRouter(client));
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/operations/${opId}/schedule`;
  const res = await fetch(`${base}/shifts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userUpn: 'user1', role: 'IMO', startsAt: '2025-08-17T10:00:00Z', endsAt: '2025-08-17T12:00:00Z' })
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.code, 'not_in_roster');
  server.close();
});

test('GET /now returns active shifts at given time', async () => {
  const { client, opId } = await setupDb();
  await addRoster(client, opId);
  await svc.createShift(client, opId, { userUpn: 'user1', role: 'IMO', startsAt: '2025-08-17T10:00:00Z', endsAt: '2025-08-17T12:00:00Z' }, 'tester');
  const app = express();
  app.use('/operations/:opId/schedule', createScheduleRouter(client));
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/operations/${opId}/schedule`;
  const res = await fetch(`${base}/now?at=2025-08-17T11:00:00Z`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.roles.IMO);
  assert.equal(body.roles.IMO[0].userUpn, 'user1');
  server.close();
});
