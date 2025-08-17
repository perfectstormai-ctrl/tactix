import request from 'supertest';
import { describe, it, expect } from 'vitest';

// Provide dummy key so jwt.verify does not throw for missing key
process.env.JWT_PUBLIC_KEY = 'test-key';

// eslint-disable-next-line import/first
import app from '../index.js';

describe('auth-service', () => {
  it('GET /health returns ok response', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.ts).toBe('string');
  });

  it('POST /login without credentials returns 400', async () => {
    const res = await request(app).post('/login').send({});
    expect(res.status).toBe(400);
  });

  it('POST /refresh with invalid token returns 401', async () => {
    const res = await request(app).post('/refresh').send({ refresh: 'bad' });
    expect(res.status).toBe(401);
  });
});
