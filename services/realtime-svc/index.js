const express = require('express');
const { Server } = require('ws');
const app = express();
app.get('/health', (_req, res) => res.send('realtime ok'));
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => console.log(`realtime-svc listening on ${PORT}`));
const wss = new Server({ server });
wss.on('connection', ws => ws.send('hello'));
