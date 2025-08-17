import request from 'supertest';
import path from 'path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

process.env.DISCOVERY_KEYS_DIR = path.join(__dirname, 'keys');
process.env.SERVER_URL = 'http://localhost:3010';
process.env.SERVER_NAME = 'Test Server';

let app: any;
let createInvite: any;
let shutdown: any;

beforeAll(async () => {
  const mod = await import('../src/index');
  app = mod.default;
  createInvite = mod.createInvite;
  shutdown = mod.shutdown;
});

afterAll(() => {
  shutdown();
});

describe('discovery-svc', () => {
  it('GET /discovery/health returns ok', async () => {
    const res = await request(app).get('/discovery/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('invite verify happy path', async () => {
    const res = await request(app).get('/discovery/invite');
    const invite = res.body.invite;
    expect(typeof invite).toBe('string');
    const verify = await request(app)
      .post('/discovery/verify-invite')
      .send({ invite });
    expect(verify.body.ok).toBe(true);
    expect(verify.body.serverId).toBeTruthy();
  });

  it('invite verify expired', async () => {
    const { invite } = await createInvite(Date.now() - 1000);
    const verify = await request(app)
      .post('/discovery/verify-invite')
      .send({ invite });
    expect(verify.body.ok).toBe(false);
    expect(verify.body.error).toBe('expired');
  });

  it('announce then servers returns self', async () => {
    await request(app).post('/discovery/announce');
    // wait a bit for browse to record
    await new Promise((r) => setTimeout(r, 100));
    const res = await request(app).get('/discovery/servers');
    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find((s: any) => s.serverId);
    expect(found).toBeTruthy();
  });
});
