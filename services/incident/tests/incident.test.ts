import request from 'supertest';
import { createApp } from '../src/api.js';
import { InMemoryEventStore } from '../src/infrastructure/EventStore.js';

describe('incident service', () => {
  const store = new InMemoryEventStore();
  const app = createApp(store);

  it('creates a draft incident', async () => {
    const res = await request(app)
      .post('/incidents')
      .send({ title: 'T', description: 'D', org: 'unit' })
      .expect(201);
    expect(res.body.status).toBe('Draft');
    expect(res.body.title).toBe('T');
    expect(res.body.id).toBeDefined();
  });

  it('adds messages and submits', async () => {
    const createRes = await request(app)
      .post('/incidents')
      .send({ title: 'X', description: 'Y', org: 'unit' })
      .expect(201);
    const id = createRes.body.id;

    const msgRes = await request(app)
      .post(`/incidents/${id}/messages`)
      .send({ message: 'hello' })
      .expect(200);
    expect(msgRes.body.messages).toEqual(['hello']);

    const submitRes = await request(app)
      .post(`/incidents/${id}/submit`)
      .expect(200);
    expect(submitRes.body.status).toBe('Submitted');
  });
});
