import express from 'express';
import dotenv from 'dotenv';
import { requireAuth } from '@tactix/authz';
import { loadTemplates } from './templates.js';

dotenv.config();

const app = express();
const templates = loadTemplates();

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use(requireAuth);

app.get('/orders/templates', (_req, res) => {
  res.json(templates);
});

app.get('/orders/templates/:id', (req, res) => {
  const tpl = templates.find((t) => t.id === req.params.id);
  if (!tpl) return res.status(404).json({});
  res.json(tpl);
});

const port = Number(process.env.PORT) || 3006;
app.listen(port, () => {
  console.log(`orders-svc listening on ${port}`);
});
