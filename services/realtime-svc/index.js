const express = require('express');
const WebSocket = require('ws');
const { Server } = WebSocket;
const { client, xml } = require('@xmpp/client');
require('dotenv').config();

const app = express();
app.get('/health', (_req, res) => res.send('realtime ok'));

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () =>
  console.log(`realtime-svc listening on ${PORT}`)
);

// WebSocket server for browser clients
const wss = new Server({ server });

// Setup XMPP client
const xmpp = client({
  service: process.env.XMPP_URL,
  domain: process.env.XMPP_DOMAIN,
  username: process.env.XMPP_USERNAME,
  password: process.env.XMPP_PASSWORD,
});

xmpp.on('error', err => console.error('xmpp error', err));

// Forward incoming XMPP messages to all connected WebSocket clients
xmpp.on('stanza', stanza => {
  if (stanza.is('message')) {
    const body = stanza.getChildText('body');
    if (body) {
      wss.clients.forEach(wsClient => {
        if (wsClient.readyState === WebSocket.OPEN) {
          wsClient.send(body);
        }
      });
    }
  }
});

// Start XMPP connection
xmpp.start().catch(err => console.error('xmpp start failed', err));

// Send messages from WebSocket to XMPP
wss.on('connection', ws => {
  ws.on('message', msg => {
    const to = process.env.XMPP_TO;
    if (to) {
      const message = xml('message', { type: 'chat', to }, xml('body', {}, msg.toString()));
      xmpp.send(message).catch(err => console.error('xmpp send failed', err));
    }
  });
});
