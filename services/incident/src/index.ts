import express from 'express';
import { z } from 'zod';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';

const app = express();
app.use(express.json());

const PGURL = process.env.PGURL || '';
const pool = PGURL ? new Pool({ connectionString: PGURL }) : null;

// Fallback in-memory store (only if DB not available yet)
const mem = {
  incidents: [] as { id: string; title: string; severity: string; createdAt: string }[]
};

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/incidents', async (_req, res) => {
  if (!pool) return res.json(mem.incidents);
  const rows = await pool.query('select incident_id as id, title, severity, updated_at as "createdAt" from incidents order by updated_at desc limit 50');
  res.json(rows.rows);
});

const CreateSchema = z.object({
  title: z.string().min(1),
  severity: z.enum(['info','minor','major','critical'])
});

app.post('/incidents', async (req, res) => {
  const parsed = CreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const now = new Date().toISOString();
  if (!pool) {
    const id = randomUUID();
    mem.incidents.unshift({ id, title: parsed.data.title, severity: parsed.data.severity, createdAt: now });
    return res.status(201).json({ incidentId: id });
  }
  // DB-backed minimal insert (projection table only; events come in next PR)
  const id = randomUUID();
  await pool.query(
    `insert into incidents(incident_id, title, description, status, severity, last_event_seq, updated_at)
         values ($1, $2, '', 'draft', $3, 0, now())`,
    [id, parsed.data.title, parsed.data.severity]
  );
  return res.status(201).json({ incidentId: id });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`incident-svc listening on :${port}`);
});
