import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

process.env.JWT_PRIVATE_KEY = 'test';
process.env.JWT_PUBLIC_KEY = 'test';
jwt.sign = () => 'token';

// eslint-disable-next-line import/first
import app from '../index.js';

const CONFIG_PATH = path.resolve(__dirname, '../../../tactix.config.json');
let originalConfig = '';

beforeAll(() => {
  originalConfig = fs.readFileSync(CONFIG_PATH, 'utf-8');
});

afterAll(() => {
  fs.writeFileSync(CONFIG_PATH, originalConfig);
});

describe('auth-service', () => {
  it('GET /health returns ok response', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.ts).toBe('string');
  });

  it('POST /login with local user succeeds', async () => {
    const res = await request(app)
      .post('/login')
      .send({ upn: 'admin', password: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body.user.upn).toBe('admin');
  });

  it('POST /login without credentials returns 400', async () => {
    const res = await request(app).post('/login').send({});
    expect(res.status).toBe(400);
  });

  it('POST /refresh with invalid token returns 401', async () => {
    const res = await request(app).post('/refresh').send({ refresh: 'bad' });
    expect(res.status).toBe(401);
  });

  it('POST /ldap/test with bad host returns error', async () => {
    const res = await request(app)
      .post('/ldap/test')
      .send({ host: '127.0.0.1', port: 65000, baseDn: '', bindDn: '', bindPw: '' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(false);
  });

  it('POST /ldap/save writes config', async () => {
    const cfg = { host: 'h', port: 389, starttls: false, baseDn: 'dc=x', bindDn: 'cn=y', bindPw: 'pw' };
    const res = await request(app).post('/ldap/save').send(cfg);
    expect(res.status).toBe(200);
    const saved = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    expect(saved.ldap.host).toBe('h');
  });
});
