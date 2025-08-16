const express = require('express');
const loadMessages = require('./messageLoader');

const app = express();
let cache = [];

async function ensureCache() {
  if (cache.length === 0) {
    cache = await loadMessages();
  }
}

app.get('/health', (_req, res) => res.send('tak ingest ok'));

app.get('/messages', async (req, res) => {
  await ensureCache();
  const q = (req.query.q || '').toLowerCase();
  const result = !q
    ? cache
    : cache.filter((m) => {
        const target = m.message ? m.message : JSON.stringify(m);
        return target.toLowerCase().includes(q);
      });
  res.json(result);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`tak-ingest-svc listening on ${PORT}`));
