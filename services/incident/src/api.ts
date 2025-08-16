import express from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { EventStore } from './infrastructure/EventStore.js';
import { Incident } from './domain/Incident.js';

export function createApp(store: EventStore) {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req: any, res: any) => {
    res.json({ ok: true });
  });

  app.post('/incidents', async (req: any, res: any, next: any) => {
    try {
      const schema = z.object({ title: z.string(), description: z.string(), org: z.string() });
      const { title, description, org } = schema.parse(req.body);
      const id = randomUUID();
      const [incident, event] = Incident.create({ id, title, description, org });
      await store.append(id, event);
      res.status(201).json(incident.toJSON());
    } catch (err) {
      next(err);
    }
  });

  app.get('/incidents/:id', async (req: any, res: any, next: any) => {
    try {
      const id = req.params.id;
      const events = await store.load(id);
      if (events.length === 0) {
        res.sendStatus(404);
        return;
      }
      const incident = Incident.from(id, events);
      res.json(incident.toJSON());
    } catch (err) {
      next(err);
    }
  });

  app.post('/incidents/:id/messages', async (req: any, res: any, next: any) => {
    try {
      const schema = z.object({ message: z.string() });
      const { message } = schema.parse(req.body);
      const id = req.params.id;
      const events = await store.load(id);
      if (events.length === 0) {
        res.sendStatus(404);
        return;
      }
      const incident = Incident.from(id, events);
      const event = incident.addMessage(message);
      await store.append(id, event);
      res.json(incident.toJSON());
    } catch (err) {
      next(err);
    }
  });

  app.post('/incidents/:id/submit', async (req: any, res: any, next: any) => {
    try {
      const id = req.params.id;
      const events = await store.load(id);
      if (events.length === 0) {
        res.sendStatus(404);
        return;
      }
      const incident = Incident.from(id, events);
      const event = incident.submit();
      await store.append(id, event);
      res.json(incident.toJSON());
    } catch (err) {
      next(err);
    }
  });

  return app;
}
