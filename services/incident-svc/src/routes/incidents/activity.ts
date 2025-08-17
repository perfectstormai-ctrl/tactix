import http from 'node:http';

export type Client = any;
export type AuthenticatedRequest = any;

function json(res: http.ServerResponse, code: number, body: any) {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

export async function getActivityHandler(
  _req: AuthenticatedRequest,
  res: http.ServerResponse,
  incidentId: number,
  client: Client
) {
  const url = new URL(_req.url || '', 'http://localhost');
  const limit = Math.min(Number(url.searchParams.get('limit')) || 100, 500);
  const chat = await client.query(
    'SELECT msg_id, author_upn, text, created_at FROM incident_chat_messages WHERE incident_id=$1',
    [incidentId]
  );
  const warlog = await client.query(
    'SELECT message_id, author_upn, content, created_at FROM incident_messages WHERE incident_id=$1',
    [incidentId]
  );
  const tasks = await client.query(
    'SELECT task_id, title, status, updated_at FROM incident_tasks WHERE incident_id=$1',
    [incidentId]
  );
  const items: any[] = [
    ...chat.rows.map((r: any) => ({
      kind: 'chat',
      id: r.msg_id,
      authorUpn: r.author_upn,
      text: r.text,
      createdAt: r.created_at,
    })),
    ...warlog.rows.map((r: any) => ({
      kind: 'warlog',
      id: r.message_id,
      authorUpn: r.author_upn,
      text: r.content,
      createdAt: r.created_at,
    })),
    ...tasks.rows.map((r: any) => ({
      kind: 'task',
      id: r.task_id,
      title: r.title,
      status: r.status,
      createdAt: r.updated_at,
    })),
  ];
  items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return json(res, 200, items.slice(0, limit));
}
