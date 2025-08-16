import jwt from 'jsonwebtoken';

type IncomingMessage = any;
type ServerResponse = any;

declare const process: any;

const PUBLIC_KEY = (process.env.JWT_PUBLIC_KEY || '').replace(/\\n/g, '\n');

export interface AuthPayload {
  sub: string;
  roles: string[];
  ad_groups: string[];
}

export interface AuthenticatedRequest extends IncomingMessage {
  user?: AuthPayload;
}

function sendJson(res: ServerResponse, code: number, body: any) {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: ServerResponse,
  next: () => void
) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return sendJson(res, 401, { error: 'unauthorized' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, PUBLIC_KEY, {
      algorithms: ['RS256'],
    }) as any;
    req.user = {
      sub: payload.sub,
      roles: payload.roles || [],
      ad_groups: payload.ad_groups || [],
    };
    next();
  } catch (err) {
    return sendJson(res, 401, { error: 'unauthorized' });
  }
}

export function requireRole(roles: string[]) {
  return function (
    req: AuthenticatedRequest,
    res: ServerResponse,
    next: () => void
  ) {
    requireAuth(req, res, () => {
      const userRoles = req.user?.roles || [];
      if (!roles.some((r) => userRoles.includes(r))) {
        return sendJson(res, 403, { error: 'forbidden' });
      }
      next();
    });
  };
}
