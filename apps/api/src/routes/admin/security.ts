import { Router } from 'express';
import { resolveZeroTrust, bustZeroTrustCache } from '@tactix/feature-flags/zeroTrustFlag';
import { getSecuritySettings, updateZeroTrustEnabled } from '@tactix/settings/securitySettingsRepo';
import { EventEmitter } from 'events';

export const auditEmitter = new EventEmitter();

const r = Router();

function requireRole(req: any, res: any, next: any) {
  const roles = req.user?.roles || [];
  if (roles.includes('Admin') || roles.includes('SecurityOfficer')) return next();
  return res.status(403).json({ message: 'Forbidden' });
}

r.get('/zero-trust', requireRole, async (req, res) => {
  const { val, source } = await resolveZeroTrust();
  const row = await getSecuritySettings().catch(() => null);
  const locked = process.env.TACTIX_ZT_LOCKED === 'true';
  res.json({
    enabled: val,
    locked,
    source,
    updatedAt: row?.updated_at ?? null,
    updatedBy: row?.updated_by ?? null
  });
});

r.put('/zero-trust', requireRole, async (req, res) => {
  const locked = process.env.TACTIX_ZT_LOCKED === 'true';
  if (locked) return res.status(423).json({ message: 'Zero-Trust toggle locked by environment' });

  const enabled = !!req.body?.enabled;
  const actor = req.user?.username || 'system';
  await updateZeroTrustEnabled(enabled, actor);
  bustZeroTrustCache();

  auditEmitter.emit('SecuritySettingChanged', {
    category: 'security.config',
    action: 'zero_trust_toggle',
    actor,
    enabled
  });

  const { val, source } = await resolveZeroTrust();
  res.json({ enabled: val, locked: false, source, updatedBy: actor, updatedAt: new Date().toISOString() });
});

export default r;
