const { test, mock } = require('node:test');
const assert = require('node:assert');

async function importFlag() {
  return require('../dist/zeroTrustFlag.js');
}

test('LOCKED env forces enabled', async () => {
  process.env.TACTIX_ZT_LOCKED = 'true';
  const { getZeroTrustEnabled, bustZeroTrustCache } = await importFlag();
  const val = await getZeroTrustEnabled();
  assert.equal(val, true);
  bustZeroTrustCache();
  delete process.env.TACTIX_ZT_LOCKED;
});

test('DB value takes precedence over DEFAULT', async () => {
  process.env.TACTIX_ZT_LOCKED = 'false';
  process.env.TACTIX_ZT_DEFAULT = 'false';
  mock.module('@tactix/settings/securitySettingsRepo', {
    getSecuritySettings: async () => ({ zero_trust_enabled: true })
  });
  const { getZeroTrustEnabled, bustZeroTrustCache } = await importFlag();
  const val = await getZeroTrustEnabled();
  assert.equal(val, true);
  bustZeroTrustCache();
  delete process.env.TACTIX_ZT_DEFAULT;
});

test('falls back to DEFAULT when DB missing', async () => {
  process.env.TACTIX_ZT_LOCKED = 'false';
  process.env.TACTIX_ZT_DEFAULT = 'true';
  mock.module('@tactix/settings/securitySettingsRepo', {
    getSecuritySettings: async () => null
  });
  const { getZeroTrustEnabled, bustZeroTrustCache } = await importFlag();
  const val = await getZeroTrustEnabled();
  assert.equal(val, true);
  bustZeroTrustCache();
  delete process.env.TACTIX_ZT_DEFAULT;
});

test('cache bust works', async () => {
  process.env.TACTIX_ZT_DEFAULT = 'false';
  mock.module('@tactix/settings/securitySettingsRepo', {
    getSecuritySettings: async () => ({ zero_trust_enabled: false })
  });
  let { getZeroTrustEnabled, bustZeroTrustCache } = await importFlag();
  let val = await getZeroTrustEnabled();
  assert.equal(val, false);
  mock.module('@tactix/settings/securitySettingsRepo', {
    getSecuritySettings: async () => ({ zero_trust_enabled: true })
  });
  val = await getZeroTrustEnabled();
  assert.equal(val, false, 'should use cache');
  bustZeroTrustCache();
  ({ getZeroTrustEnabled } = await importFlag());
  val = await getZeroTrustEnabled();
  assert.equal(val, true, 'after bust cache, new value');
  bustZeroTrustCache();
});
