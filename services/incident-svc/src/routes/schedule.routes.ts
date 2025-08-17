import express from 'express';
import { z } from 'zod';
import type { Client } from '@tactix/lib-db';
import * as svc from '../services/schedule.service.js';

const shiftInput = z.object({
  userUpn: z.string(),
  role: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  notes: z.string().optional()
});

export function createScheduleRouter(client: Client) {
  const router = express.Router({ mergeParams: true });

  router.get('/roster', async (req, res) => {
    const { role, active } = req.query as any;
    const opId = (req.params as any).opId;
    const rows = await svc.listRoster(client, opId, {
      role: role as string | undefined,
      active: active === undefined ? undefined : active === 'true'
    });
    res.json(rows);
  });

  router.get('/shifts', async (req, res) => {
    const { from, to, role, user } = req.query as any;
    const opId = (req.params as any).opId;
    const rows = await svc.listShifts(client, opId, from as string | undefined, to as string | undefined, role as string | undefined, user as string | undefined);
    res.json(rows);
  });

  router.post('/shifts', express.json(), async (req, res) => {
    const parse = shiftInput.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ code: 'invalid' });
    try {
      const opId = (req.params as any).opId;
      const row = await svc.createShift(client, opId, parse.data, 'system');
      res.status(201).json(row);
    } catch (e: any) {
      res.status(e.status || 500).json(e.body || { code: 'error' });
    }
  });

  router.patch('/shifts/:shiftId', express.json(), async (req, res) => {
    const parse = shiftInput.partial().safeParse(req.body);
    if (!parse.success) return res.status(400).json({ code: 'invalid' });
    try {
      const opId = (req.params as any).opId;
      const row = await svc.updateShift(client, opId, req.params.shiftId, parse.data);
      res.json(row);
    } catch (e: any) {
      res.status(e.status || 500).json(e.body || { code: 'error' });
    }
  });

  router.delete('/shifts/:shiftId', async (req, res) => {
    try {
      const opId = (req.params as any).opId;
      await svc.deleteShift(client, opId, req.params.shiftId);
      res.status(204).end();
    } catch (e: any) {
      res.status(e.status || 500).json(e.body || { code: 'error' });
    }
  });

  router.get('/now', async (req, res) => {
    const opId = (req.params as any).opId;
    const at = (req.query.at as string) || new Date().toISOString();
    const result = await svc.listActiveAt(client, opId, at);
    res.json(result);
  });

  return router;
}
