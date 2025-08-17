import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { pool } from './index.js';
import { ORG_CODE } from './env.js';
import { requireAuth, AuthenticatedRequest, hasRole } from './auth.js';
import { canEditPlaybooks } from './rbac.js';

const router = Router();

const CreateBody = z.object({
  name: z.string().min(1),
  json: z.any(),
});

router.get('/incidents/:incidentId/playbooks', requireAuth, async (req, res) => {
  const incidentId = req.params.incidentId;
  const { rows } = await pool.query(
    'SELECT playbook_id, name FROM playbooks WHERE incident_id = $1 ORDER BY name',
    [incidentId]
  );
  res.json({
    playbooks: rows.map((r: any) => ({ id: r.playbook_id, name: r.name })),
  });
});

router.post('/incidents/:incidentId/playbooks', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!canEditPlaybooks(req.user?.roles || [])) {
    return res.status(403).json({ error: 'forbidden' });
  }
  const incidentId = req.params.incidentId;
  const parsed = CreateBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const id = randomUUID();
  await pool.query(
    'INSERT INTO playbooks (playbook_id, incident_id, name, json, created_by) VALUES ($1,$2,$3,$4,$5)',
    [id, incidentId, parsed.data.name, JSON.stringify(parsed.data.json), req.user?.sub || 'system']
  );
  res.status(201).json({ playbook: { id, name: parsed.data.name } });
});

router.get('/playbooks/:id', requireAuth, async (req, res) => {
  const id = req.params.id;
  const { rows } = await pool.query(
    'SELECT playbook_id, incident_id, name, json FROM playbooks WHERE playbook_id = $1',
    [id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'not_found' });
  res.json({ playbook: rows[0] });
});

const RunBody = z.object({
  incidentId: z.string().min(8),
  message: z.string().min(1).max(2000).optional(),
  severity: z.enum(['info', 'warning', 'critical']).optional(),
});

router.post('/playbooks/:id/run', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!hasRole(req.user, 'DO')) {
    return res.status(403).json({ error: 'forbidden' });
  }
  const id = req.params.id;
  const { rows } = await pool.query('SELECT name, json FROM playbooks WHERE playbook_id = $1', [id]);
  if (!rows[0]) return res.status(404).json({ error: 'playbook_not_found' });
  const parsed = RunBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const actorUpn = req.user?.sub || 'system';
  const runId = randomUUID();
  const now = new Date().toISOString();
  const message = parsed.data.message || rows[0].json?.defaultMessage || `Playbook ${rows[0].name} triggered`;
  const severity = parsed.data.severity || rows[0].json?.defaultSeverity || 'info';
  const envelope = {
    type: 'PLAYBOOK_NOTIFY',
    playbookId: id,
    incidentId: parsed.data.incidentId,
    operationCode: ORG_CODE,
    severity,
    title: rows[0].name,
    text: message,
    actorUpn,
    occurredAt: now,
  };
  await pool.query('NOTIFY tactix_events, $1', [JSON.stringify(envelope)]);
  await pool.query(
    'INSERT INTO playbook_runs (run_id, playbook_id, incident_id, requested_by, approved_by, status) VALUES ($1,$2,$3,$4,$5,$6)',
    [runId, id, parsed.data.incidentId, actorUpn, actorUpn, 'executed']
  );
  res.json({ ok: true, runId });
});

export default router;
