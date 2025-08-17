// @ts-nocheck
import http from 'node:http';
import { URL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { Client, createClient } from '@tactix/lib-db';
import { requireAuth, requireRole, AuthenticatedRequest } from '@tactix/authz';
import { effective } from './rbac/effective';
import { draftMessageHandler, submitMessageHandler } from './routes/incidents/messages.js';
import { getChatHandler, postChatHandler } from './routes/incidents/chat.js';
import { getTasksHandler, postTaskHandler, patchTaskHandler } from './routes/incidents/tasks.js';
import { getActivityHandler } from './routes/incidents/activity.js';

declare const process: any;
declare const Buffer: any;
declare function require(name: string): any;
declare const module: any;
declare function fetch(input: any, init?: any): Promise<any>;

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

async function sendXmppMessage(jid: string, content: string) {
  if (!process.env.XMPP_URL) return;
  try {
    await fetch(process.env.XMPP_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jid, content }),
    });
  } catch (_) {
    /* ignore */
  }
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

    const mePerms =
      req.method === 'GET' && url.pathname === '/me/effective-permissions';
    if (mePerms) {
      return requireAuth(req as AuthenticatedRequest, res, async () => {
        const operationCode = url.searchParams.get('operationCode');
        if (!operationCode || !dbClient) {
          return json(res, 400, { error: 'operationCode required' });
        }
        const opRes = await dbClient.query(
          'SELECT operation_id FROM operations WHERE code=$1',
          [operationCode]
        );
        if (!opRes.rowCount) {
          return json(res, 200, { roles: [] });
        }
        const opId = opRes.rows[0].operation_id;
        const assignRes = await dbClient.query(
          'SELECT user_upn, active FROM assignments WHERE operation_id=$1 AND user_upn=$2',
          [opId, req.user!.sub]
        );
        const roleRes = await dbClient.query(
          'SELECT user_upn, role FROM role_grants WHERE operation_id=$1 AND user_upn=$2',
          [opId, req.user!.sub]
        );
        const perms = effective(
          { upn: req.user!.sub, ad_groups: req.user!.ad_groups || [] },
          operationCode,
          assignRes.rows,
          roleRes.rows
        );
        return json(res, 200, { roles: Array.from(perms.roles) });
      });
    }

    const permMatch = url.pathname.match(/^\/operations\/([^/]+)\/permissions$/);
    if (req.method === 'GET' && permMatch && dbClient) {
      const opId = permMatch[1];
      return requireAuth(req as AuthenticatedRequest, res, async () => {
        const opRes = await dbClient.query(
          'SELECT operation_id, code, title FROM operations WHERE operation_id=$1',
          [opId]
        );
        if (!opRes.rowCount) return json(res, 404, {});
        const op = opRes.rows[0];
        const myAssign = await dbClient.query(
          'SELECT user_upn, active FROM assignments WHERE operation_id=$1 AND user_upn=$2',
          [opId, req.user!.sub]
        );
        const myRoles = await dbClient.query(
          'SELECT user_upn, role FROM role_grants WHERE operation_id=$1 AND user_upn=$2',
          [opId, req.user!.sub]
        );
        const perms = effective(
          { upn: req.user!.sub, ad_groups: req.user!.ad_groups || [] },
          op.code,
          myAssign.rows,
          myRoles.rows
        );
        if (!perms.roles.has('READ')) return json(res, 403, { error: 'forbidden' });
        const { rows: assignments } = await dbClient.query(
          'SELECT * FROM assignments WHERE operation_id=$1',
          [opId]
        );
        const { rows: roleGrants } = await dbClient.query(
          'SELECT * FROM role_grants WHERE operation_id=$1',
          [opId]
        );
        let outAssignments = assignments;
        let outRoleGrants: any[] | undefined = roleGrants;
        if (!perms.roles.has('ASSIGN')) {
          outAssignments = assignments.filter(
            (a) => a.user_upn === req.user!.sub
          );
          outRoleGrants = undefined;
        }
        const body: any = {
          operation: { id: op.operation_id, code: op.code, title: op.title },
          assignments: outAssignments,
          canAssign: perms.roles.has('ASSIGN'),
        };
        if (perms.roles.has('ASSIGN')) body.roleGrants = outRoleGrants;
        return json(res, 200, body);
      });
    }

    const assignMatch = url.pathname.match(/^\/operations\/([^/]+)\/assignments$/);
    if (req.method === 'POST' && assignMatch && dbClient) {
      const opId = assignMatch[1];
      return requireAuth(req as AuthenticatedRequest, res, async () => {
        const opRes = await dbClient.query(
          'SELECT code FROM operations WHERE operation_id=$1',
          [opId]
        );
        if (!opRes.rowCount) return json(res, 404, {});
        const code = opRes.rows[0].code;
        const myAssign = await dbClient.query(
          'SELECT user_upn, active FROM assignments WHERE operation_id=$1 AND user_upn=$2',
          [opId, req.user!.sub]
        );
        const myRoles = await dbClient.query(
          'SELECT user_upn, role FROM role_grants WHERE operation_id=$1 AND user_upn=$2',
          [opId, req.user!.sub]
        );
        const perms = effective(
          { upn: req.user!.sub, ad_groups: req.user!.ad_groups || [] },
          code,
          myAssign.rows,
          myRoles.rows
        );
        if (!perms.roles.has('ASSIGN'))
          return json(res, 403, { error: 'forbidden' });
        const body = await readBody(req).catch(() => null);
        if (!body || !body.userUpn) {
          return json(res, 400, { error: 'userUpn required' });
        }
        const existing = await dbClient.query(
          'SELECT assignment_id FROM assignments WHERE operation_id=$1 AND user_upn=$2',
          [opId, body.userUpn]
        );
        let row;
        if (existing.rowCount) {
          await dbClient.query(
            'UPDATE assignments SET position_id=$1, alt_display_name=$2, active=TRUE WHERE assignment_id=$3',
            [body.positionId || null, body.altDisplayName || null, existing.rows[0].assignment_id]
          );
          row = (
            await dbClient.query(
              'SELECT * FROM assignments WHERE assignment_id=$1',
              [existing.rows[0].assignment_id]
            )
          ).rows[0];
        } else {
          const id = randomUUID();
          row = (
            await dbClient.query(
              'INSERT INTO assignments (assignment_id, operation_id, user_upn, position_id, alt_display_name, created_by_upn) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
              [
                id,
                opId,
                body.userUpn,
                body.positionId || null,
                body.altDisplayName || null,
                req.user!.sub,
              ]
            )
          ).rows[0];
        }
        return json(res, 201, row);
      });
    }

    const assignDelMatch = url.pathname.match(
      /^\/operations\/([^/]+)\/assignments\/([^/]+)$/
    );
    if (req.method === 'DELETE' && assignDelMatch && dbClient) {
      const opId = assignDelMatch[1];
      const assignmentId = assignDelMatch[2];
      return requireAuth(req as AuthenticatedRequest, res, async () => {
        const opRes = await dbClient.query(
          'SELECT code FROM operations WHERE operation_id=$1',
          [opId]
        );
        if (!opRes.rowCount) return json(res, 404, {});
        const code = opRes.rows[0].code;
        const myAssign = await dbClient.query(
          'SELECT user_upn, active FROM assignments WHERE operation_id=$1 AND user_upn=$2',
          [opId, req.user!.sub]
        );
        const myRoles = await dbClient.query(
          'SELECT user_upn, role FROM role_grants WHERE operation_id=$1 AND user_upn=$2',
          [opId, req.user!.sub]
        );
        const perms = effective(
          { upn: req.user!.sub, ad_groups: req.user!.ad_groups || [] },
          code,
          myAssign.rows,
          myRoles.rows
        );
        if (!perms.roles.has('ASSIGN'))
          return json(res, 403, { error: 'forbidden' });
        await dbClient.query(
          'UPDATE assignments SET active=FALSE WHERE assignment_id=$1 AND operation_id=$2',
          [assignmentId, opId]
        );
        res.statusCode = 204;
        return res.end();
      });
    }

    const roleMatch = url.pathname.match(/^\/operations\/([^/]+)\/roles$/);
    if (req.method === 'POST' && roleMatch && dbClient) {
      const opId = roleMatch[1];
      return requireAuth(req as AuthenticatedRequest, res, async () => {
        const opRes = await dbClient.query(
          'SELECT code FROM operations WHERE operation_id=$1',
          [opId]
        );
        if (!opRes.rowCount) return json(res, 404, {});
        const code = opRes.rows[0].code;
        const myAssign = await dbClient.query(
          'SELECT user_upn, active FROM assignments WHERE operation_id=$1 AND user_upn=$2',
          [opId, req.user!.sub]
        );
        const myRoles = await dbClient.query(
          'SELECT user_upn, role FROM role_grants WHERE operation_id=$1 AND user_upn=$2',
          [opId, req.user!.sub]
        );
        const perms = effective(
          { upn: req.user!.sub, ad_groups: req.user!.ad_groups || [] },
          code,
          myAssign.rows,
          myRoles.rows
        );
        if (!perms.roles.has('ASSIGN'))
          return json(res, 403, { error: 'forbidden' });
        const body = await readBody(req).catch(() => null);
        if (!body || !body.userUpn || !body.role) {
          return json(res, 400, { error: 'userUpn and role required' });
        }
        const row = (
          await dbClient.query(
            'INSERT INTO role_grants (grant_id, operation_id, user_upn, role, created_by_upn) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (operation_id, user_upn, role) DO UPDATE SET created_by_upn=$5 RETURNING *',
            [randomUUID(), opId, body.userUpn, body.role, req.user!.sub]
          )
        ).rows[0];
        return json(res, 201, row);
      });
    }

    const orgMatch = url.pathname.match(/^\/operations\/([^/]+)\/org-units$/);
    if (req.method === 'GET' && orgMatch && dbClient) {
      const opId = orgMatch[1];
      const { rows } = await dbClient.query(
        'SELECT org_unit_id, scope, unit_name, xmpp_jid FROM org_units WHERE operation_id=$1',
        [opId]
      );
      return json(res, 200, rows);
    }

    const draftMatch = url.pathname.match(/^\/incidents\/(\d+)\/messages\/draft$/);
    if (req.method === 'POST' && draftMatch && dbClient) {
      const incidentId = Number(draftMatch[1]);
      return requireAuth(req as AuthenticatedRequest, res, () =>
        draftMessageHandler(req as AuthenticatedRequest, res, incidentId, dbClient!)
      );
    }

    const submitMatch = url.pathname.match(/^\/incidents\/(\d+)\/messages\/submit$/);
    if (req.method === 'POST' && submitMatch && dbClient) {
      const incidentId = Number(submitMatch[1]);
      return requireAuth(req as AuthenticatedRequest, res, () =>
        submitMessageHandler(req as AuthenticatedRequest, res, incidentId, dbClient!)
      );
    }

    const chatMatch = url.pathname.match(/^\/incidents\/(\d+)\/chat$/);
    if (chatMatch && dbClient) {
      const incidentId = Number(chatMatch[1]);
      if (req.method === 'GET') {
        return requireAuth(req as AuthenticatedRequest, res, () =>
          getChatHandler(req as AuthenticatedRequest, res, incidentId, dbClient!)
        );
      }
      if (req.method === 'POST') {
        return requireAuth(req as AuthenticatedRequest, res, () =>
          postChatHandler(req as AuthenticatedRequest, res, incidentId, dbClient!)
        );
      }
    }

    const tasksMatch = url.pathname.match(/^\/incidents\/(\d+)\/tasks$/);
    if (tasksMatch && dbClient) {
      const incidentId = Number(tasksMatch[1]);
      if (req.method === 'GET') {
        return requireAuth(req as AuthenticatedRequest, res, () =>
          getTasksHandler(req as AuthenticatedRequest, res, incidentId, dbClient!)
        );
      }
      if (req.method === 'POST') {
        return requireAuth(req as AuthenticatedRequest, res, () =>
          postTaskHandler(req as AuthenticatedRequest, res, incidentId, dbClient!)
        );
      }
    }

    const taskPatchMatch = url.pathname.match(/^\/incidents\/(\d+)\/tasks\/([^/]+)$/);
    if (taskPatchMatch && req.method === 'PATCH' && dbClient) {
      const incidentId = Number(taskPatchMatch[1]);
      const taskId = taskPatchMatch[2];
      return requireAuth(req as AuthenticatedRequest, res, () =>
        patchTaskHandler(req as AuthenticatedRequest, res, incidentId, taskId, dbClient!)
      );
    }

    const activityMatch = url.pathname.match(/^\/incidents\/(\d+)\/activity$/);
    if (activityMatch && req.method === 'GET' && dbClient) {
      const incidentId = Number(activityMatch[1]);
      return requireAuth(req as AuthenticatedRequest, res, () =>
        getActivityHandler(req as AuthenticatedRequest, res, incidentId, dbClient!)
      );
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
      return requireRole(['dispatcher'])(req as any, res as any, async () => {
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
      });
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
