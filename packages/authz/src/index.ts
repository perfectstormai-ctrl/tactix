import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

export interface User {
  upn: string;
  roles: string[];
  ad_groups: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}

function sendJson(res: Response, code: number, body: any) {
  res.status(code).json(body);
}

interface RoleRule {
  regex: RegExp;
  roles: string[];
}

function loadRoleMapping(): RoleRule[] {
  try {
    const raw = JSON.parse(process.env.ROLE_MAPPING_JSON || '{}');
    return Object.entries(raw).map(([pattern, roles]) => ({
      regex: new RegExp(pattern),
      roles: Array.isArray(roles) ? (roles as string[]) : [],
    }));
  } catch {
    return [];
  }
}

const ROLE_RULES = loadRoleMapping();

function mapRoles(groups: string[]): string[] {
  const acc = new Set<string>();
  for (const g of groups) {
    for (const rule of ROLE_RULES) {
      if (rule.regex.test(g)) {
        for (const r of rule.roles) acc.add(r);
      }
    }
  }
  return Array.from(acc);
}

export function verifyJwtRS256(publicKey: string) {
  const key = publicKey.replace(/\\n/g, '\n');
  return function requireAuth(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer ')) {
      return sendJson(res, 401, { error: 'unauthorized' });
    }
    const token = header.slice(7);
    try {
      const payload: any = jwt.verify(token, key, { algorithms: ['RS256'] });
      const ad_groups = Array.isArray(payload.ad_groups) ? payload.ad_groups : [];
      req.user = {
        upn: payload.sub,
        ad_groups,
        roles: mapRoles(ad_groups),
      };
      next();
    } catch {
      return sendJson(res, 401, { error: 'unauthorized' });
    }
  };
}

const DEFAULT_PUBLIC_KEY = (process.env.JWT_PUBLIC_KEY || '').replace(/\\n/g, '\n');
export const requireAuth = verifyJwtRS256(DEFAULT_PUBLIC_KEY);

export function hasAnyRole(user: User | undefined, roles: string[]) {
  if (!user) return false;
  return roles.some((r) => user.roles.includes(r));
}

export function requireRole(roles: string[]) {
  return function (req: AuthenticatedRequest, res: Response, next: NextFunction) {
    requireAuth(req, res, () => {
      if (!hasAnyRole(req.user, roles)) {
        return sendJson(res, 403, { error: 'forbidden' });
      }
      next();
    });
  };
}

export function decodeJwt(token: string, publicKey: string = DEFAULT_PUBLIC_KEY): User {
  const payload: any = jwt.verify(token, publicKey.replace(/\\n/g, '\n'), {
    algorithms: ['RS256'],
  });
  const ad_groups = Array.isArray(payload.ad_groups) ? payload.ad_groups : [];
  return {
    upn: payload.sub,
    ad_groups,
    roles: mapRoles(ad_groups),
  };
}
