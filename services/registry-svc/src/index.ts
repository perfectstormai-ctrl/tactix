import express from 'express';
import { register, lookup } from './registry.js';

const app = express();
app.use(express.json());

app.post('/registry/register', (req, res) => {
  try {
    register(req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: 'invalid' });
  }
});

app.get('/registry/lookup', (req, res) => {
  const serverId = req.query.serverId;
  if (typeof serverId !== 'string') return res.status(400).json({ error: 'invalid' });
  const entry = lookup(serverId);
  if (!entry) return res.status(404).json({ error: 'not_found' });
  res.json({ url: entry.url, fingerprint: entry.fingerprint });
});

app.get('/health', (_req, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(port, () => console.log(`registry-svc listening on ${port}`));
}

export default app;
