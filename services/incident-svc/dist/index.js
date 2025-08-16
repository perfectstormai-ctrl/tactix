"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setClient = setClient;
exports.createServer = createServer;
exports.getEvents = getEvents;
exports.getAttachments = getAttachments;
exports.getObject = getObject;
const node_http_1 = __importDefault(require("node:http"));
const node_url_1 = require("node:url");
const node_crypto_1 = require("node:crypto");
const lib_db_1 = { createClient: () => { throw new Error('lib-db unavailable'); } };
const incidents = [];
const events = [];
let nextIncidentId = 1;
let nextEventId = 1;
const attachments = [];
let nextAttachmentId = 1;
const objectStore = new Map();
let dbClient = null;
function setClient(client) {
    dbClient = client;
}
async function indexIncident(_incident) {
    // stub for future OpenSearch integration
}
async function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => (data += chunk));
        req.on('end', () => {
            try {
                resolve(data ? JSON.parse(data) : {});
            }
            catch (e) {
                reject(e);
            }
        });
        req.on('error', reject);
    });
}
async function readMultipart(req) {
    const contentType = req.headers['content-type'];
    if (!contentType)
        return null;
    const match = contentType.match(/boundary=([^;]+)/);
    if (!match)
        return null;
    const boundary = '--' + match[1];
    const chunks = [];
    return new Promise((resolve, reject) => {
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
            const buffer = Buffer.concat(chunks);
            const parts = buffer.toString('binary').split(boundary);
            for (const part of parts) {
                if (!part || part === '--\r\n')
                    continue;
                const [head, tail] = part.split('\r\n\r\n');
                if (!head || !tail)
                    continue;
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
function json(res, code, body) {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(body));
}
function createServer() {
    if (!dbClient && process.env.DATABASE_URL) {
        dbClient = (0, lib_db_1.createClient)();
        dbClient.connect().catch(() => {
            dbClient = null;
        });
    }
    return node_http_1.default.createServer(async (req, res) => {
        if (!req.url)
            return json(res, 404, {});
        const url = new node_url_1.URL(req.url, 'http://localhost');
        if (req.method === 'GET' && url.pathname === '/health') {
            return json(res, 200, { ok: true });
        }
        if (req.method === 'POST' && url.pathname === '/incidents') {
            const body = await readBody(req).catch(() => null);
            if (!body || !body.title || !body.severity) {
                return json(res, 400, { error: 'title and severity required' });
            }
            const incident = {
                id: nextIncidentId++,
                title: body.title,
                description: body.description ?? null,
                severity: body.severity,
                status: 'open',
                comments: [],
                createdAt: new Date(),
            };
            const event = {
                id: nextEventId++,
                incidentId: incident.id,
                type: 'CREATED',
                payload: { title: body.title, severity: body.severity, description: body.description },
                createdAt: new Date(),
            };
            events.push(event);
            incidents.push(incident);
            await indexIncident(incident);
            return json(res, 201, incident);
        }
        if (req.method === 'GET' && url.pathname === '/incidents') {
            const status = url.searchParams.get('status') ?? undefined;
            const q = url.searchParams.get('q') ?? undefined;
            if (dbClient) {
                const params = [];
                let sql = 'SELECT id, title, description, severity, status, comments, created_at AS "createdAt" FROM incidents';
                const clauses = [];
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
                if (clauses.length)
                    sql += ' WHERE ' + clauses.join(' AND ');
                const { rows } = await dbClient.query(sql, params);
                return json(res, 200, rows);
            }
            else {
                let list = incidents.slice();
                if (status)
                    list = list.filter((i) => i.status === status);
                if (q) {
                    const needle = q.toLowerCase();
                    list = list.filter((i) => i.title.toLowerCase().includes(needle) ||
                        (i.description ?? '').toLowerCase().includes(needle));
                }
                return json(res, 200, list);
            }
        }
        const incidentIdMatch = url.pathname.match(/^\/incidents\/(\d+)$/);
        if (req.method === 'GET' && incidentIdMatch) {
            const id = Number(incidentIdMatch[1]);
            const incident = incidents.find((i) => i.id === id);
            if (!incident)
                return json(res, 404, {});
            return json(res, 200, incident);
        }
        const commentMatch = url.pathname.match(/^\/incidents\/(\d+)\/comment$/);
        if (req.method === 'POST' && commentMatch) {
            const id = Number(commentMatch[1]);
            const body = await readBody(req).catch(() => null);
            if (!body || !body.comment)
                return json(res, 400, { error: 'comment required' });
            const incident = incidents.find((i) => i.id === id);
            if (!incident)
                return json(res, 404, {});
            const event = {
                id: nextEventId++,
                incidentId: id,
                type: 'COMMENT_ADDED',
                payload: { comment: body.comment },
                createdAt: new Date(),
            };
            incident.comments.push(body.comment);
            events.push(event);
            return json(res, 200, incident);
        }
        const statusMatch = url.pathname.match(/^\/incidents\/(\d+)\/status$/);
        if (req.method === 'POST' && statusMatch) {
            const id = Number(statusMatch[1]);
            const body = await readBody(req).catch(() => null);
            if (!body || !body.status)
                return json(res, 400, { error: 'status required' });
            const incident = incidents.find((i) => i.id === id);
            if (!incident)
                return json(res, 404, {});
            const event = {
                id: nextEventId++,
                incidentId: id,
                type: 'STATUS_CHANGED',
                payload: { status: body.status },
                createdAt: new Date(),
            };
            incident.status = body.status;
            events.push(event);
            return json(res, 200, incident);
        }
        const attachmentMatch = url.pathname.match(/^\/incidents\/(\d+)\/attachments$/);
        if (req.method === 'POST' && attachmentMatch) {
            const id = Number(attachmentMatch[1]);
            const incident = incidents.find((i) => i.id === id);
            if (!incident)
                return json(res, 404, {});
            const file = await readMultipart(req).catch(() => null);
            if (!file)
                return json(res, 400, { error: 'file required' });
            const objectName = `attachments/${id}/${(0, node_crypto_1.randomUUID)()}`;
            objectStore.set(objectName, file.data);
            const attachment = {
                id: nextAttachmentId++,
                incidentId: id,
                objectName,
                filename: file.filename,
                createdAt: new Date(),
            };
            attachments.push(attachment);
            const event = {
                id: nextEventId++,
                incidentId: id,
                type: 'ATTACHMENT_ADDED',
                payload: { attachmentId: attachment.id, objectName, filename: file.filename },
                createdAt: new Date(),
            };
            events.push(event);
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
function getEvents() {
    return events;
}
function getAttachments() {
    return attachments;
}
function getObject(name) {
    return objectStore.get(name);
}
