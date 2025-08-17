import type { Request, Response, NextFunction } from 'express';

export interface AuthPayload {
  sub: string;
  roles: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const user = req.header('X-User');
  if (!user) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const roles = (req.header('X-Roles') || '').split(',').filter(Boolean);
  req.user = { sub: user, roles };
  next();
}
