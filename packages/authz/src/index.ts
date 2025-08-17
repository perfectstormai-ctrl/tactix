import jwt from 'jsonwebtoken';
import type { IncomingMessage, ServerResponse } from 'http';

const PUBLIC_KEY = (process.env.JWT_PUBLIC_KEY || '').replace(/\\n/g, '\n');

export interface User {
  upn: string;
  name?: string;
  ad_groups: string[];
}

export interface AuthenticatedRequest extends IncomingMessage {
  user?: User;
}

function send(res: ServerResponse, code: number, body: any) {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

export function verifyJwt(publicKey: string) {
  return function requireAuth(
    req: AuthenticatedRequest,
    res: ServerResponse,
    next: () => void
  ) {
    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer ')) {
      return send(res, 401, { error: 'unauthorized' });
    }
    try {
      const payload: any = jwt.verify(header.slice(7), publicKey, {
        algorithms: ['RS256'],
      });
      req.user = {
        upn: payload.sub,
        name: payload.name,
        ad_groups: Array.isArray(payload.ad_groups) ? payload.ad_groups : [],
      };
      next();
    } catch {
      return send(res, 401, { error: 'unauthorized' });
    }
  };
}

export const requireAuth = verifyJwt(PUBLIC_KEY);

export function hasAnyGroup(user: User | undefined, groups: string[]) {
  if (!user) return false;
  return groups.some((g) => user.ad_groups.includes(g));
}

export function hasRole(
  user: User | undefined,
  role: 'DO' | 'IMO' | 'SDO' | 'G3 OPS' | 'ADMIN'
) {
  if (!user) return false;
  return hasAnyGroup(user, [role]);
}

export function requireRole(groups: string[]) {
  return function (
    req: AuthenticatedRequest,
    res: ServerResponse,
    next: () => void
  ) {
    requireAuth(req, res, () => {
      if (!hasAnyGroup(req.user, groups)) {
        return send(res, 403, { error: 'forbidden' });
      }
      next();
    });
  };
}
