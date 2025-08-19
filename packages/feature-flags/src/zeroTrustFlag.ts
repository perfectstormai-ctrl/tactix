import { getSecuritySettings } from '@tactix/settings/securitySettingsRepo';

export type Cache = { val: boolean; ts: number; source: 'LOCKED'|'DB'|'DEFAULT' };
let cache: Cache | null = null;
const TTL_MS = 5000;

function logResolved(val: boolean, source: 'LOCKED'|'DB'|'DEFAULT'): void {
  const logger = console; // replace with proper logger if available
  logger.info?.(`Zero-Trust resolved: ${val} (source: ${source})`);
}

export async function resolveZeroTrust(): Promise<Cache> {
  const now = Date.now();
  if (cache && now - cache.ts < TTL_MS) return cache;

  const locked = process.env.TACTIX_ZT_LOCKED === 'true';
  if (locked) {
    cache = { val: true, ts: now, source: 'LOCKED' };
    logResolved(true, 'LOCKED');
    return cache;
  }

  try {
    const row = await getSecuritySettings();
    if (row && typeof row.zero_trust_enabled === 'boolean') {
      cache = { val: row.zero_trust_enabled, ts: now, source: 'DB' };
      logResolved(cache.val, 'DB');
      return cache;
    }
  } catch (e) {
    console.warn?.('Security settings DB lookup failed; falling back to default');
  }

  const def = process.env.TACTIX_ZT_DEFAULT === 'true';
  cache = { val: !!def, ts: now, source: 'DEFAULT' };
  logResolved(cache.val, 'DEFAULT');
  return cache;
}

export async function getZeroTrustEnabled(): Promise<boolean> {
  const res = await resolveZeroTrust();
  return res.val;
}

export function bustZeroTrustCache(): void {
  cache = null;
}
