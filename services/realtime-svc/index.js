require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
let verifyJwtRS256, roleMapperFromEnv, resolveRoles;
try {
  ({ verifyJwtRS256, roleMapperFromEnv, resolveRoles } = require('@tactix/authz'));
} catch {
  verifyJwtRS256 = () => ({ verify: () => ({}) });
  roleMapperFromEnv = () => ({})
  resolveRoles = () => [];
}
let createClient;
try {
  ({ createClient } = require('@tactix/lib-db'));
} catch {
  createClient = () => ({
    connect: () => Promise.resolve(),
    query: () => Promise.resolve(),
    on: () => {},
  });
}

const PORT = process.env.PORT || 3000;
const INCIDENT_SVC_URL = process.env.INCIDENT_SVC_URL || 'http://incident-svc:3000';
const MAX_QUEUE = 100;
const PUBLIC_KEY = (process.env.JWT_PUBLIC_KEY || '').replace(/\\n/g, '\n');
const { verify } = verifyJwtRS256(PUBLIC_KEY);
const ROLE_MAPPER = roleMapperFromEnv();
const BUILD_VERSION = process.env.BUILD_VERSION || '0.0.0';
const SERVICE_NAME = process.env.SERVICE_NAME || 'realtime-svc';

const openapi = {
  openapi: '3.0.3',
  info: { title: SERVICE_NAME, version: BUILD_VERSION },
  paths: {
    '/health': {
      get: {
        summary: 'Health',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/rt': {
      get: {
        summary: 'WebSocket handshake',
        security: [{ bearerAuth: [] }],
        responses: { '101': { description: 'Switching Protocols' } },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer' },
    },
  },
};

const app = express();
app.get('/health', (_req, res) =>
  res.status(200).json({
    status: 'ok',
    service: SERVICE_NAME,
    version: BUILD_VERSION,
    ts: new Date().toISOString(),
  })
);
app.get('/openapi.json', (_req, res) => res.json(openapi));

const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

function extractToken(req) {
  const proto = req.headers['sec-websocket-protocol'];
  if (proto) {
    const parts = proto.split(',').map((p) => p.trim());
    if (parts[0] === 'bearer' && parts[1]) return parts[1];
  }
  try {
    const url = new URL(req.url, 'http://localhost');
    const q = url.searchParams.get('token');
    if (q) return q;
  } catch {}
  return null;
}

server.on('upgrade', (req, socket, head) => {
  const path = req.url.split('?')[0];
  if (path === '/rt' || path === '/') {
    const token = extractToken(req);
    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    try {
      const payload = verify(token);
      const ad_groups = Array.isArray(payload.ad_groups)
        ? payload.ad_groups
        : [];
      req.user = {
        upn: payload.upn || payload.sub,
        name: payload.name,
        ad_groups,
        roles: resolveRoles(ad_groups, ROLE_MAPPER),
      };
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  } else {
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`realtime-svc listening on ${PORT}`);
});

const db = createClient();
db.connect()
  .then(() => db.query('LISTEN tactix_events'))
  .catch((err) => console.error('db connect failed', err));

db.on('notification', (msg) => {
  try {
    const event = JSON.parse(msg.payload);
    broadcast(event);
  } catch (e) {
    console.error('invalid payload', e);
  }
});

const clients = new Map();

function broadcast(event) {
  for (const [ws, state] of clients.entries()) {
    if (event.type === 'PLAYBOOK_NOTIFY' || state.incidentId === event.incidentId) {
      enqueue(ws, state, event);
    }
  }
}

function enqueue(ws, state, event) {
  if (state.queue.length >= MAX_QUEUE) {
    fetch(`${INCIDENT_SVC_URL}/incidents/${state.incidentId}`)
      .then((res) => res.json())
      .then((incident) => {
        ws.send(JSON.stringify({ type: 'snapshot', incident, seq: event.seq }));
      })
      .catch(() => {});
    state.queue = [];
    return;
  }
  state.queue.push(event);
  flush(ws, state);
}

function flush(ws, state) {
  if (state.sending || ws.readyState !== WebSocket.OPEN) return;
  const msg = state.queue.shift();
  if (!msg) return;
  state.sending = true;
  ws.send(JSON.stringify(msg), (err) => {
    state.sending = false;
    if (err) {
      ws.close();
    } else {
      flush(ws, state);
    }
  });
}

wss.on('connection', (ws, req) => {
  const state = { incidentId: null, queue: [], sending: false, user: req.user };
  clients.set(ws, state);

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }
    if (msg.type === 'subscribe' && typeof msg.incidentId === 'number') {
      state.incidentId = msg.incidentId;
      if (typeof msg.seq === 'number') {
        fetch(`${INCIDENT_SVC_URL}/incidents/${state.incidentId}`)
          .then((res) => res.json())
          .then((incident) => {
            ws.send(
              JSON.stringify({ type: 'snapshot', incident, seq: msg.seq })
            );
          })
          .catch(() => {});
      }
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

module.exports = { app, server, wss };
