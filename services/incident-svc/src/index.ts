import http from 'node:http';
import { URL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { Client, createClient } from '@tactix/lib-db';

export interface Incident {
  id: number;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  comments: string[];
  createdAt: Date;
}

interface IncidentEvent {
  id: number;
  incidentId: number;
  type: string;
  payload: any;
  createdAt: Date;
}

interface Attachment {
  id: number;
  incidentId: number;
  objectName: string;
  filename: string;
  createdAt: Date;
}

const incidents: Incident[] = [];
const events: IncidentEvent[] = [];
let nextIncidentId = 1;
let nextEventId = 1;
const attachments: Attachment[] = [];
let nextAttachmentId = 1;
const objectStore = new Map<string, Buffer>();

let dbClient: Client | null = null;

export function setClient(client: Client) {
  dbClient = client;
}

async function commitEvent(event: IncidentEvent): Promise<void> {
  events.push(event);
  if (dbClient) {
    const envelope = {
      incidentId: event.incidentId,
      seq: event.id,
      type: event.type,
      payload: event.payload,
    };
    try {
      await dbClient.query('NOTIFY tactix_events, $1', [JSON.stringify(envelope)]);
    } catch (_) {
      /* ignore notify failures */
    }
  }
}

async function indexIncident(_incident: Incident): Promise<void> {
  // stub for future OpenSearch integration
}

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

async function readMultipart(
  req: http.IncomingMessage
): Promise<{ filename: string; data: Buffer } | null> {
  const contentType = req.headers['content-type'];
  if (!contentType) return null;
  const match = contentType.match(/boundary=([^;]+)/);
  if (!match) return null;
  const boundary = '--' + match[1];
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const parts = buffer.toString('binary').split(boundary);
      for (const part of parts) {
        if (!part || part === '--\r\n') continue;
        const [head, tail] = part.split('\r\n\r\n');
        if (!head || !tail) continue;
        const nameMatch = head.match(/name=\"([^\"]+)\"/);
        const filenameMatch = head.match(/filename=\"([^\"]+)\"/);
        if (nameMatch && nameMatch[1] === 'file' && filenameMatch) {
          const dataStr = tail.slice(0, -2);
          const data = Buffer.from(dataStr, 'binary');
          resolve({ filename: filenameMatch[1], data });
          return;
        }
      }
      resolve(null);
    });
    req.on('error', reject);
  });
}

function json(res: http.ServerResponse, code: number, body: any) {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

export function createServer() {
  if (!dbClient && process.env.DATABASE_URL) {
    dbClient = createClient();
    dbClient.connect().catch(() => {
      dbClient = null;
    });
  }
  return http.createServer(async (req, res) => {
    if (!req.url) return json(res, 404, {});
    const url = new URL(req.url, 'http://localhost');

    if (req.method === 'GET' && url.pathname === '/health') {
      return json(res, 200, { ok: true });
    }

    if (req.method === 'POST' && url.pathname === '/incidents') {
      const body = await readBody(req).catch(() => null);
      if (!body || !body.title || !body.severity) {
        return json(res, 400, { error: 'title and severity required' });
      }
      const incident: Incident = {
        id: nextIncidentId++,
        title: body.title,
        description: body.description ?? null,
        severity: body.severity,
        status: 'open',
        comments: [],
        createdAt: new Date(),
      };
      const event: IncidentEvent = {
        id: nextEventId++,
        incidentId: incident.id,
        type: 'CREATED',
        payload: { title: body.title, severity: body.severity, description: body.description },
        createdAt: new Date(),
      };
      incidents.push(incident);
      await commitEvent(event);
      await indexIncident(incident);
      return json(res, 201, incident);
    }

    if (req.method === 'GET' && url.pathname === '/incidents') {
      const status = url.searchParams.get('status') ?? undefined;
      const q = url.searchParams.get('q') ?? undefined;
      if (dbClient) {
        const params: any[] = [];
        let sql =
          'SELECT id, title, description, severity, status, comments, created_at AS "createdAt" FROM incidents';
        const clauses: string[] = [];
        if (status) {
          params.push(status);
          clauses.push(`status = $${params.length}`);
        }
        if (q) {
          params.push(`%${q}%`, `%${q}%`);
          const a = params.length - 1;
          const b = params.length;
          clauses.push(`(title ILIKE $${a} OR COALESCE(description, '') ILIKE $${b})`);
        }
        if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ');
        const { rows } = await dbClient.query(sql, params);
        return json(res, 200, rows);
      } else {
        let list = incidents.slice();
        if (status) list = list.filter((i) => i.status === status);
        if (q) {
          const needle = q.toLowerCase();
          list = list.filter(
            (i) =>
              i.title.toLowerCase().includes(needle) ||
              (i.description ?? '').toLowerCase().includes(needle)
          );
        }
        return json(res, 200, list);
      }
    }

    const incidentIdMatch = url.pathname.match(/^\/incidents\/(\d+)$/);
    if (req.method === 'GET' && incidentIdMatch) {
      const id = Number(incidentIdMatch[1]);
      const incident = incidents.find((i) => i.id === id);
      if (!incident) return json(res, 404, {});
      return json(res, 200, incident);
    }

    const commentMatch = url.pathname.match(/^\/incidents\/(\d+)\/comment$/);
    if (req.method === 'POST' && commentMatch) {
      const id = Number(commentMatch[1]);
      const body = await readBody(req).catch(() => null);
      if (!body || !body.comment) return json(res, 400, { error: 'comment required' });
      const incident = incidents.find((i) => i.id === id);
      if (!incident) return json(res, 404, {});
      const event: IncidentEvent = {
        id: nextEventId++,
        incidentId: id,
        type: 'COMMENT_ADDED',
        payload: { comment: body.comment },
        createdAt: new Date(),
      };
      incident.comments.push(body.comment);
      await commitEvent(event);
      return json(res, 200, incident);
    }

    const statusMatch = url.pathname.match(/^\/incidents\/(\d+)\/status$/);
    if (req.method === 'POST' && statusMatch) {
      const id = Number(statusMatch[1]);
      const body = await readBody(req).catch(() => null);
      if (!body || !body.status) return json(res, 400, { error: 'status required' });
      const incident = incidents.find((i) => i.id === id);
      if (!incident) return json(res, 404, {});
      const event: IncidentEvent = {
        id: nextEventId++,
        incidentId: id,
        type: 'STATUS_CHANGED',
        payload: { status: body.status },
        createdAt: new Date(),
      };
      incident.status = body.status;
      await commitEvent(event);
      return json(res, 200, incident);
    }

    const attachmentMatch = url.pathname.match(/^\/incidents\/(\d+)\/attachments$/);
    if (req.method === 'POST' && attachmentMatch) {
      const id = Number(attachmentMatch[1]);
      const incident = incidents.find((i) => i.id === id);
      if (!incident) return json(res, 404, {});
      const file = await readMultipart(req).catch(() => null);
      if (!file) return json(res, 400, { error: 'file required' });
      const objectName = `attachments/${id}/${randomUUID()}`;
      objectStore.set(objectName, file.data);
      const attachment: Attachment = {
        id: nextAttachmentId++,
        incidentId: id,
        objectName,
        filename: file.filename,
        createdAt: new Date(),
      };
      attachments.push(attachment);
      const event: IncidentEvent = {
        id: nextEventId++,
        incidentId: id,
        type: 'ATTACHMENT_ADDED',
        payload: { attachmentId: attachment.id, objectName, filename: file.filename },
        createdAt: new Date(),
      };
      await commitEvent(event);
      return json(res, 201, attachment);
    }

    return json(res, 404, {});
  });
}

function main() {
  const server = createServer();
  const port = Number(process.env.PORT) || 3000;
  server.listen(port, () => {
    console.log(`incident-svc listening on ${port}`);
  });
}

if (require.main === module) {
  main();
}

export function getEvents() {
  return events;
}

export function getAttachments() {
  return attachments;
}

export function getObject(name: string) {
  return objectStore.get(name);
}
