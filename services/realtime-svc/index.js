require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.get('/health', (_req, res) => res.json({ ok: true }));
app.post('/events', (req, res) => {
  const event = req.body;
  broadcast(event);
  res.json({ ok: true });
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/rt' });

const clients = new Map();

wss.on('connection', (ws) => {
  const state = { incidentId: null };
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
    }
  });

  ws.on('close', () => clients.delete(ws));
});

function broadcast(event) {
  const msg = JSON.stringify(event);
  for (const [ws, state] of clients.entries()) {
    if (state.incidentId === null || state.incidentId === event.incidentId) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    }
  }
}

server.listen(PORT, () => {
  console.log(`realtime-svc listening on ${PORT}`);
});
