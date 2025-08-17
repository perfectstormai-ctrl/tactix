const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.static(__dirname));
app.use(express.json());

const CONFIG_PATH = path.join(__dirname, '..', 'tactix.config.json');

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/config.js', (_req, res) => {
  const enabled = process.env.ENG_ENABLED === 'true' ? 'true' : 'false';
  res.type('application/javascript').send(`window.ENG_ENABLED=${enabled};`);
});

app.get('/client-config', (_req, res) => {
  if (fs.existsSync(CONFIG_PATH)) {
    res.json(JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')));
  } else {
    res.json({});
  }
});

app.post('/client-config', (req, res) => {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(req.body, null, 2));
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ui listening on ${PORT}`));
