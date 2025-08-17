import crypto from 'crypto';

export interface InvitePayload {
  serverId: string;
  exp: number;
  sig: string;
}

export function generateInvite(serverId: string, secret: string, expiresInSeconds = 300): string {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const base = JSON.stringify({ serverId, exp });
  const sig = crypto.createHmac('sha256', secret).update(base).digest('hex');
  const full: InvitePayload = { serverId, exp, sig };
  return Buffer.from(JSON.stringify(full)).toString('base64url');
}

export function decodeInvite(code: string): InvitePayload | null {
  try {
    return JSON.parse(Buffer.from(code, 'base64url').toString('utf8')) as InvitePayload;
  } catch {
    return null;
  }
}

export function verifyInvite(code: string, secret: string): { serverId: string } | null {
  const payload = decodeInvite(code);
  if (!payload) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  const base = JSON.stringify({ serverId: payload.serverId, exp: payload.exp });
  const expected = crypto.createHmac('sha256', secret).update(base).digest('hex');
  if (expected !== payload.sig) return null;
  return { serverId: payload.serverId };
}
