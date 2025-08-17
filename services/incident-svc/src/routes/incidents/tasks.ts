import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

export type Client = any;
export type AuthenticatedRequest = any;

async function readBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function json(res: http.ServerResponse, code: number, body: any) {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

export async function getTasksHandler(
  req: AuthenticatedRequest,
  res: http.ServerResponse,
  incidentId: number,
  client: Client
) {
  const url = new URL(req.url || '', 'http://localhost');
  const status = url.searchParams.get('status');
  const params: any[] = [incidentId];
  let sql =
    'SELECT task_id, incident_id, role, assignee_upn, title, description, status, created_by, created_at, updated_at FROM incident_tasks WHERE incident_id=$1';
  if (status) {
    params.push(status);
    sql += ` AND status=$${params.length}`;
  }
  sql += ' ORDER BY updated_at DESC';
  const { rows } = await client.query(sql, params);
  return json(res, 200, rows);
}

export async function postTaskHandler(
  req: AuthenticatedRequest,
  res: http.ServerResponse,
  incidentId: number,
  client: Client
) {
  const body = await readBody(req).catch(() => null);
  const schema = z.object({
    role: z.string(),
    assigneeUpn: z.string().optional(),
    title: z.string(),
    description: z.string(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return json(res, 400, { error: 'invalid body' });
  const taskId = randomUUID();
  const createdBy = req.user?.sub || parsed.data.assigneeUpn || 'unknown';
  const now = new Date();
  const { rows } = await client.query(
    'INSERT INTO incident_tasks (task_id, incident_id, role, assignee_upn, title, description, status, created_by, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) RETURNING *',
    [
      taskId,
      incidentId,
      parsed.data.role,
      parsed.data.assigneeUpn || null,
      parsed.data.title,
      parsed.data.description,
      'open',
      createdBy,
      now,
    ]
  );
  const task = rows[0];
  try {
    await client.query('NOTIFY tactix_events, $1', [
      JSON.stringify({
        type: 'INCIDENT_TASK_CREATED',
        incidentId,
        taskId,
        title: task.title,
        status: task.status,
      }),
    ]);
  } catch {}
  return json(res, 201, task);
}

export async function patchTaskHandler(
  req: AuthenticatedRequest,
  res: http.ServerResponse,
  incidentId: number,
  taskId: string,
  client: Client
) {
  const body = await readBody(req).catch(() => null);
  const schema = z.object({
    status: z.enum(['open', 'in_progress', 'done', 'cancelled']).optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    assigneeUpn: z.string().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return json(res, 400, { error: 'invalid body' });
  const fields: string[] = [];
  const params: any[] = [];
  if (parsed.data.status) {
    fields.push(`status=$${params.length + 1}`);
    params.push(parsed.data.status);
  }
  if (parsed.data.title) {
    fields.push(`title=$${params.length + 1}`);
    params.push(parsed.data.title);
  }
  if (parsed.data.description) {
    fields.push(`description=$${params.length + 1}`);
    params.push(parsed.data.description);
  }
  if (parsed.data.assigneeUpn !== undefined) {
    fields.push(`assignee_upn=$${params.length + 1}`);
    params.push(parsed.data.assigneeUpn);
  }
  if (!fields.length) return json(res, 200, {});
  fields.push(`updated_at=$${params.length + 1}`);
  params.push(new Date());
  params.push(incidentId);
  params.push(taskId);
  const sql = `UPDATE incident_tasks SET ${fields.join(', ')} WHERE incident_id=$${
    params.length - 1
  } AND task_id=$${params.length} RETURNING *`;
  const { rows } = await client.query(sql, params);
  if (rows.length === 0) return json(res, 404, {});
  const task = rows[0];
  try {
    await client.query('NOTIFY tactix_events, $1', [
      JSON.stringify({
        type: 'INCIDENT_TASK_UPDATED',
        incidentId,
        taskId,
        status: task.status,
      }),
    ]);
  } catch {}
  return json(res, 200, task);
}
