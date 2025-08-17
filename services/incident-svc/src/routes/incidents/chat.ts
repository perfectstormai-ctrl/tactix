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

export async function getChatHandler(
  req: AuthenticatedRequest,
  res: http.ServerResponse,
  incidentId: number,
  client: Client
) {
  const url = new URL(req.url || '', 'http://localhost');
  const since = url.searchParams.get('since');
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200);
  const params: any[] = [incidentId];
  let sql =
    'SELECT msg_id, incident_id, author_upn, text, created_at FROM incident_chat_messages WHERE incident_id=$1';
  if (since) {
    params.push(new Date(since));
    sql += ` AND created_at > $${params.length}`;
  }
  params.push(limit);
  sql += ` ORDER BY created_at DESC LIMIT $${params.length}`;
  const { rows } = await client.query(sql, params);
  return json(res, 200, rows);
}

export async function postChatHandler(
  req: AuthenticatedRequest,
  res: http.ServerResponse,
  incidentId: number,
  client: Client
) {
  const body = await readBody(req).catch(() => null);
  const schema = z.object({
    text: z.string().min(1).max(2000),
    authorUpn: z.string().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return json(res, 400, { error: 'invalid body' });
  const msgId = randomUUID();
  const author = parsed.data.authorUpn || req.user?.sub || 'unknown';
  const { rows } = await client.query(
    'INSERT INTO incident_chat_messages (msg_id, incident_id, author_upn, text) VALUES ($1,$2,$3,$4) RETURNING *',
    [msgId, incidentId, author, parsed.data.text]
  );
  const msg = rows[0];
  try {
    await client.query('NOTIFY tactix_events, $1', [
      JSON.stringify({
        type: 'INCIDENT_CHAT',
        incidentId,
        msgId,
        authorUpn: author,
        text: msg.text,
        createdAt: msg.created_at,
      }),
    ]);
  } catch {}
  return json(res, 201, msg);
}
