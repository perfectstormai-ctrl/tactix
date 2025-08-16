const http = require('node:http');
const { URL } = require('node:url');

let incidents = [];
let events = [];
let nextIncidentId = 1;
let nextEventId = 1;

function readBody(req) {
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

function json(res, code, body) {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

function createServer() {
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
      return json(res, 201, incident);
    }

    if (req.method === 'GET' && url.pathname === '/incidents') {
      const status = url.searchParams.get('status');
      const q = url.searchParams.get('q');
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
      if (!body || !body.status) return json(res, 400, { error: 'status required' });
      const incident = incidents.find((i) => i.id === id);
      if (!incident) return json(res, 404, {});
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

module.exports = { createServer };
