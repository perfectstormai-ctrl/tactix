require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { createClient } = require('@tactix/lib-db');

const PORT = process.env.PORT || 3000;
const INCIDENT_SVC_URL = process.env.INCIDENT_SVC_URL || 'http://incident-svc:3000';
const MAX_QUEUE = 100;

const app = express();
app.get('/health', (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  if (req.url === '/rt') {
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

wss.on('connection', (ws) => {
  const state = { incidentId: null, queue: [], sending: false };
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
