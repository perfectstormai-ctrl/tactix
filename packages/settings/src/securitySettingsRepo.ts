import { Client } from '@tactix/lib-db';
import type { SecuritySettings } from './securitySettings';

export async function getSecuritySettings(): Promise<SecuritySettings | null> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const q = 'SELECT id, zero_trust_enabled, updated_at, updated_by FROM security_settings WHERE id=1';
    const r = await client.query(q);
    return r.rows[0] ?? null;
  } finally {
    await client.end();
  }
}

export async function updateZeroTrustEnabled(enabled: boolean, actor: string): Promise<void> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const q = `
      INSERT INTO security_settings (id, zero_trust_enabled, updated_at, updated_by)
      VALUES (1, $1, NOW(), $2)
      ON CONFLICT (id) DO UPDATE SET zero_trust_enabled=$1, updated_at=NOW(), updated_by=$2
    `;
    await client.query(q, [enabled, actor]);
  } finally {
    await client.end();
  }
}
