const { test, mock } = require('node:test');
const assert = require('node:assert');
const express = require('express');
const request = require('supertest');

mock.module('@tactix/settings/securitySettingsRepo', {
  getSecuritySettings: async () => ({ zero_trust_enabled: false, updated_at: '2024-01-01', updated_by: 'admin', id:1 }),
  updateZeroTrustEnabled: async () => {}
});

async function createApp() {
  process.env.TACTIX_ZT_LOCKED = 'true';
  const router = require('../dist/routes/admin/security.js').default;
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { req.user = { roles: ['Admin'], username: 'tester' }; next(); });
  app.use('/admin/settings', router);
  return app;
}

test('PUT /zero-trust returns 423 when locked', async () => {
  const app = await createApp();
  const res = await request(app).put('/admin/settings/zero-trust').send({ enabled: true });
  assert.equal(res.status, 423);
  delete process.env.TACTIX_ZT_LOCKED;
});
