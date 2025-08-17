import type { Client } from '@tactix/lib-db';
import { durationHours } from '../lib/time.js';
import { ShiftInput } from '../types/schedule.js';
import * as repo from '../repo/schedule.repo.js';

const SHIFT_MAX_HOURS = Number(process.env.SHIFT_MAX_HOURS ?? 48);
const ALLOW_OVERSIZE_SHIFTS = (process.env.ALLOW_OVERSIZE_SHIFTS ?? 'false') === 'true';
const SCHEDULE_HORIZON_DAYS = Number(process.env.SCHEDULE_HORIZON_DAYS ?? 365);

function withinHorizon(date: Date): boolean {
  const now = Date.now();
  const horizon = SCHEDULE_HORIZON_DAYS * 24 * 60 * 60 * 1000;
  return Math.abs(date.getTime() - now) <= horizon;
}

function throwErr(status: number, body: any): never {
  const err: any = new Error(body.code || 'error');
  err.status = status;
  err.body = body;
  throw err;
}

export async function createShift(
  client: Client,
  opId: string,
  input: ShiftInput,
  createdBy: string
) {
  const start = new Date(input.startsAt);
  const end = new Date(input.endsAt);
  if (!(start < end)) throwErr(400, { code: 'invalid_time' });
  if (!withinHorizon(start) || !withinHorizon(end)) throwErr(400, { code: 'out_of_horizon' });
  const hours = durationHours(start, end);
  if (hours > SHIFT_MAX_HOURS && !ALLOW_OVERSIZE_SHIFTS) {
    throwErr(400, { code: 'duration_exceeds_max', maxHours: SHIFT_MAX_HOURS });
  }
  const rosterOk = await repo.rosterExists(client, opId, input.userUpn, input.role);
  if (!rosterOk) throwErr(400, { code: 'not_in_roster' });
  const conflict = await client.query(
    'SELECT shift_id FROM cp_shifts WHERE operation_id=$1 AND user_upn=$2 AND role=$3 AND starts_at < $5 AND ends_at > $4 LIMIT 1',
    [opId, input.userUpn, input.role, input.startsAt, input.endsAt]
  );
  if (conflict.rows[0]) {
    throwErr(409, { code: 'overlap', conflictingShiftId: conflict.rows[0].shift_id });
  }
  const row = await repo.createShift(client, opId, input, createdBy);
  const envelope = {
    type: 'SCHEDULE_SHIFT_CREATED',
    operationId: opId,
    shift: {
      shiftId: row.shiftId,
      userUpn: row.userUpn,
      role: row.role,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      notes: row.notes ?? ''
    }
  };
  try {
    await client.query('NOTIFY tactix_events, $1', [JSON.stringify(envelope)]);
  } catch (_) {}
  return row;
}

export async function updateShift(
  client: Client,
  opId: string,
  shiftId: string,
  patch: Partial<ShiftInput>
) {
  const existing = await repo.getShift(client, opId, shiftId);
  if (!existing) throwErr(404, { code: 'not_found' });
  const next = { ...existing, ...patch } as any;
  const start = new Date(next.startsAt);
  const end = new Date(next.endsAt);
  if (!(start < end)) throwErr(400, { code: 'invalid_time' });
  if (!withinHorizon(start) || !withinHorizon(end)) throwErr(400, { code: 'out_of_horizon' });
  const hours = durationHours(start, end);
  if (hours > SHIFT_MAX_HOURS && !ALLOW_OVERSIZE_SHIFTS) {
    throwErr(400, { code: 'duration_exceeds_max', maxHours: SHIFT_MAX_HOURS });
  }
  const rosterOk = await repo.rosterExists(client, opId, next.userUpn, next.role);
  if (!rosterOk) throwErr(400, { code: 'not_in_roster' });
  const conflict = await client.query(
    'SELECT shift_id FROM cp_shifts WHERE operation_id=$1 AND user_upn=$2 AND role=$3 AND shift_id<>$4 AND starts_at < $6 AND ends_at > $5 LIMIT 1',
    [opId, next.userUpn, next.role, shiftId, next.startsAt, next.endsAt]
  );
  if (conflict.rows[0]) {
    throwErr(409, { code: 'overlap', conflictingShiftId: conflict.rows[0].shift_id });
  }
  const row = await repo.updateShift(client, opId, shiftId, patch);
  if (!row) throwErr(404, { code: 'not_found' });
  const envelope = {
    type: 'SCHEDULE_SHIFT_UPDATED',
    operationId: opId,
    shift: {
      shiftId: row.shiftId,
      userUpn: row.userUpn,
      role: row.role,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      notes: row.notes ?? ''
    }
  };
  try {
    await client.query('NOTIFY tactix_events, $1', [JSON.stringify(envelope)]);
  } catch (_) {}
  return row;
}

export async function deleteShift(client: Client, opId: string, shiftId: string) {
  await repo.deleteShift(client, opId, shiftId);
  const envelope = {
    type: 'SCHEDULE_SHIFT_DELETED',
    operationId: opId,
    shiftId
  };
  try {
    await client.query('NOTIFY tactix_events, $1', [JSON.stringify(envelope)]);
  } catch (_) {}
}

export async function listRoster(client: Client, opId: string, filters: any) {
  return repo.listRoster(client, opId, filters);
}

export async function listShifts(
  client: Client,
  opId: string,
  from?: string,
  to?: string,
  role?: string,
  user?: string
) {
  return repo.listShifts(client, opId, from, to, role, user);
}

export async function getShift(client: Client, opId: string, shiftId: string) {
  return repo.getShift(client, opId, shiftId);
}

export async function listActiveAt(client: Client, opId: string, atIso: string) {
  const rows = await repo.listActiveAt(client, opId, atIso);
  const roles: Record<string, any[]> = {};
  for (const r of rows) {
    if (!roles[r.role]) roles[r.role] = [];
    roles[r.role].push({
      userUpn: r.user_upn,
      displayName: r.display_name,
      shiftId: r.shift_id,
      endsAt: r.ends_at
    });
  }
  return { at: atIso, roles };
}
