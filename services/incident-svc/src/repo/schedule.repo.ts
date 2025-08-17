import type { Client } from '@tactix/lib-db';
import { ShiftInput, ShiftRow } from '../types/schedule.js';

export async function listRoster(
  client: Client,
  opId: string,
  filters: { role?: string; active?: boolean }
) {
  const params: any[] = [opId];
  let sql = 'SELECT * FROM cp_roster WHERE operation_id=$1';
  if (filters.role) {
    params.push(filters.role);
    sql += ` AND role=$${params.length}`;
  }
  if (filters.active !== undefined) {
    params.push(filters.active);
    sql += ` AND active=$${params.length}`;
  }
  const { rows } = await client.query(sql, params);
  return rows;
}

export async function listShifts(
  client: Client,
  opId: string,
  from?: string,
  to?: string,
  role?: string,
  user?: string
) {
  const params: any[] = [opId];
  let sql = 'SELECT * FROM cp_shifts WHERE operation_id=$1';
  if (from && to) {
    params.push(to, from);
    sql += ` AND starts_at < $${params.length - 1} AND ends_at > $${params.length}`;
  }
  if (role) {
    params.push(role);
    sql += ` AND role=$${params.length}`;
  }
  if (user) {
    params.push(user);
    sql += ` AND user_upn=$${params.length}`;
  }
  const { rows } = await client.query(sql, params);
  return rows;
}

export async function getShift(client: Client, opId: string, shiftId: string) {
  const { rows } = await client.query(
    'SELECT * FROM cp_shifts WHERE operation_id=$1 AND shift_id=$2',
    [opId, shiftId]
  );
  return rows[0] || null;
}

export async function createShift(
  client: Client,
  opId: string,
  input: ShiftInput,
  createdBy: string
): Promise<ShiftRow> {
  const { rows } = await client.query(
    `INSERT INTO cp_shifts
      (shift_id, operation_id, user_upn, role, starts_at, ends_at, notes, created_by)
      VALUES (gen_random_uuid(), $1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
    [opId, input.userUpn, input.role, input.startsAt, input.endsAt, input.notes ?? null, createdBy]
  );
  return camel(rows[0]);
}

export async function updateShift(
  client: Client,
  opId: string,
  shiftId: string,
  patch: Partial<ShiftInput>
): Promise<ShiftRow | null> {
  const fields: string[] = [];
  const params: any[] = [];
  let idx = 1;
  if (patch.userUpn) {
    fields.push(`user_upn=$${idx++}`);
    params.push(patch.userUpn);
  }
  if (patch.role) {
    fields.push(`role=$${idx++}`);
    params.push(patch.role);
  }
  if (patch.startsAt) {
    fields.push(`starts_at=$${idx++}`);
    params.push(patch.startsAt);
  }
  if (patch.endsAt) {
    fields.push(`ends_at=$${idx++}`);
    params.push(patch.endsAt);
  }
  if (patch.notes !== undefined) {
    fields.push(`notes=$${idx++}`);
    params.push(patch.notes);
  }
  if (!fields.length) return getShift(client, opId, shiftId);
  params.push(opId, shiftId);
  const { rows } = await client.query(
    `UPDATE cp_shifts SET ${fields.join(', ')} WHERE operation_id=$${idx++} AND shift_id=$${idx}
      RETURNING *`,
    params
  );
  return rows[0] ? camel(rows[0]) : null;
}

export async function deleteShift(client: Client, opId: string, shiftId: string) {
  await client.query('DELETE FROM cp_shifts WHERE operation_id=$1 AND shift_id=$2', [opId, shiftId]);
}

export async function listActiveAt(client: Client, opId: string, atIso: string) {
  const { rows } = await client.query(
    `SELECT s.shift_id, s.user_upn, s.role, s.ends_at, r.display_name
     FROM cp_shifts s
     LEFT JOIN cp_roster r ON r.operation_id=s.operation_id AND r.user_upn=s.user_upn AND r.role=s.role
     WHERE s.operation_id=$1 AND s.starts_at<= $2 AND s.ends_at> $2`,
    [opId, atIso]
  );
  return rows;
}

export async function rosterExists(
  client: Client,
  opId: string,
  userUpn: string,
  role: string
) {
  const { rows } = await client.query(
    'SELECT 1 FROM cp_roster WHERE operation_id=$1 AND user_upn=$2 AND role=$3 AND active=true',
    [opId, userUpn, role]
  );
  return rows.length > 0;
}

function camel(row: any): ShiftRow {
  return {
    shiftId: row.shift_id,
    operationId: row.operation_id,
    userUpn: row.user_upn,
    role: row.role,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    notes: row.notes ?? undefined,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
