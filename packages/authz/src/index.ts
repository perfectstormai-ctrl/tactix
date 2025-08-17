import type { Request, Response, NextFunction } from 'express';
import type { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';

export interface TactixUser {
  upn: string;
  name?: string;
  ad_groups: string[];
  roles: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: TactixUser;
}

export type RoleMapper = Array<{ regex: RegExp; roles: string[] }>;

export function verifyJwtRS256(publicKey: string) {
  const key = publicKey.replace(/\\n/g, '\n');
  return {
    decode(token: string) {
      return jwt.decode(token) as Record<string, any> | null;
    },
    verify(token: string) {
      return jwt.verify(token, key, { algorithms: ['RS256'] }) as Record<string, any>;
    },
  };
}

export function roleMapperFromEnv(envVar = 'ROLE_MAPPING_JSON'): RoleMapper {
  try {
    const raw = JSON.parse(process.env[envVar] || '{}') as Record<string, string[]>;
    return Object.entries(raw).map(([pattern, roles]) => ({
      regex: new RegExp(pattern),
      roles: Array.isArray(roles) ? roles : [],
    }));
  } catch {
    return [];
  }
}

export function resolveRoles(ad_groups: string[], mapper: RoleMapper): string[] {
  const acc = new Set<string>();
  for (const g of ad_groups) {
    for (const rule of mapper) {
      if (rule.regex.test(g)) {
        for (const r of rule.roles) acc.add(r);
      }
    }
  }
  return Array.from(acc);
}

interface RequireAuthOpts {
  publicKey?: string;
  roleMapper?: RoleMapper;
}

export function requireAuth(opts: RequireAuthOpts = {}) {
  const pub = (opts.publicKey || process.env.PUBLIC_JWT_KEY || '').replace(/\\n/g, '\n');
  const { verify } = verifyJwtRS256(pub);
  const mapper = opts.roleMapper || roleMapperFromEnv();
  return function (req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    const token = header.slice(7);
    try {
      const payload: any = verify(token);
      const ad_groups = Array.isArray(payload.ad_groups) ? payload.ad_groups : [];
      req.user = {
        upn: payload.upn || payload.sub,
        name: payload.name,
        ad_groups,
        roles: resolveRoles(ad_groups, mapper),
      };
      next();
    } catch {
      return res.status(401).json({ error: 'unauthorized' });
    }
  };
}

export function requireRole(roles: string[]) {
  return function (req: AuthenticatedRequest, res: Response, next: NextFunction) {
    if (!req.user || !roles.some((r) => req.user!.roles.includes(r))) {
      return res.status(403).json({ error: 'forbidden' });
    }
    next();
  };
}

export interface AuthedWebSocket {
  close(code: number, reason?: string): void;
  user?: TactixUser;
}

export interface WebSocketServerLike {
  on(event: 'connection', cb: (ws: AuthedWebSocket, req: IncomingMessage) => void): void;
}

interface WsAuthOpts extends RequireAuthOpts {}

function extractToken(req: IncomingMessage): string | null {
  const proto = req.headers['sec-websocket-protocol'];
  if (typeof proto === 'string') {
    const parts = proto.split(',').map((p) => p.trim());
    if (parts[0] === 'bearer' && parts[1]) return parts[1];
  }
  try {
    const url = new URL(req.url || '', 'http://localhost');
    const t = url.searchParams.get('token');
    if (t) return t;
  } catch {
    /* noop */
  }
  return null;
}

export function wsAuth(server: WebSocketServerLike, opts: WsAuthOpts = {}) {
  const pub = (opts.publicKey || process.env.PUBLIC_JWT_KEY || '').replace(/\\n/g, '\n');
  const { verify } = verifyJwtRS256(pub);
  const mapper = opts.roleMapper || roleMapperFromEnv();
  server.on('connection', (ws: AuthedWebSocket, req: IncomingMessage) => {
    const token = extractToken(req);
    if (!token) {
      ws.close(1008, 'unauthorized');
      return;
    }
    try {
      const payload: any = verify(token);
      const ad_groups = Array.isArray(payload.ad_groups) ? payload.ad_groups : [];
      ws.user = {
        upn: payload.upn || payload.sub,
        name: payload.name,
        ad_groups,
        roles: resolveRoles(ad_groups, mapper),
      };
    } catch {
      ws.close(1008, 'unauthorized');
    }
  });
}

export default {
  verifyJwtRS256,
  requireAuth,
  roleMapperFromEnv,
  resolveRoles,
  requireRole,
  wsAuth,
};
