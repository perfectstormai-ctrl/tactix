import { Router } from 'express';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { pool } from './index.js';
import { ORG_CODE } from './env.js';
import type { PlaybookDef } from './types.js';

const router = Router();
const PB_DIR = path.resolve(process.cwd(), 'playbooks');

function loadPlaybooks(): PlaybookDef[] {
  if (!fs.existsSync(PB_DIR)) return [];
  return fs
    .readdirSync(PB_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(PB_DIR, f), 'utf-8')));
}

router.get('/playbooks', (_req, res) => {
  const list = loadPlaybooks().map((p) => ({
    id: p.id,
    name: p.name,
    summary: p.summary,
  }));
  res.json({ playbooks: list });
});

const TriggerBody = z.object({
  incidentId: z.string().min(8),
  operationCode: z.string().min(2).optional(),
  message: z.string().min(1).max(2000).optional(),
  severity: z.enum(['info', 'warning', 'critical']).optional(),
});

router.post('/playbooks/:id/trigger', async (req, res) => {
  const id = req.params.id;
  const pb = loadPlaybooks().find((p) => p.id === id);
  if (!pb) return res.status(404).json({ error: 'playbook_not_found' });

  const parsed = TriggerBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const actorUpn = (req.header('X-Actor-Upn') || 'system').toString();
  const now = new Date().toISOString();
  const message = parsed.data.message || pb.defaultMessage || `Playbook ${pb.name} triggered`;
  const severity = parsed.data.severity || pb.defaultSeverity || 'info';
  const opCode = parsed.data.operationCode || ORG_CODE;

  const envelope = {
    type: 'PLAYBOOK_NOTIFY',
    playbookId: pb.id,
    incidentId: parsed.data.incidentId,
    operationCode: opCode,
    severity,
    title: pb.name,
    text: message,
    actorUpn,
    occurredAt: now,
  };

  await pool.query('NOTIFY tactix_events, $1', [JSON.stringify(envelope)]);

  res.json({ ok: true, notified: true, envelope });
});

export default router;
