import express from 'express';
import http from 'http';
import httpProxy from 'http-proxy';
import cors from 'cors';
import {
  verifyJwtRS256,
  roleMapperFromEnv,
  resolveRoles,
  type AuthenticatedRequest,
} from '@tactix/authz';

const PORT = Number(process.env.PORT || 8080);
const API_TARGET = process.env.API_TARGET || 'http://incident-svc:3000';
const RT_TARGET = process.env.RT_TARGET || 'http://realtime-svc:3000';
const PUBLIC_JWT_KEY = (process.env.PUBLIC_JWT_KEY || '').replace(/\\n/g, '\n');

const { verify } = verifyJwtRS256(PUBLIC_JWT_KEY);
const ROLE_MAPPER = roleMapperFromEnv();
const proxy = httpProxy.createProxyServer({ changeOrigin: true });

proxy.on('proxyReq', (proxyReq, req) => {
  const auth = req.headers['authorization'];
  if (auth) proxyReq.setHeader('Authorization', auth);
});

const app = express();
app.use(
  cors({
    origin: true,
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type'],
  })
);

app.get('/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

function authMiddleware(req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) {
  const header = req.headers['authorization'];
  const cid = req.headers['x-correlation-id'] || Math.random().toString(36).slice(2);
  if (!header || !header.startsWith('Bearer ')) {
    console.warn('auth failure', { reason: 'missing', path: req.path, cid });
    return res.status(401).json({ error: 'unauthorized' });
  }
  try {
    const payload: any = verify(header.slice(7));
    const ad_groups = Array.isArray(payload.ad_groups) ? payload.ad_groups : [];
    req.user = {
      upn: payload.upn || payload.sub,
      name: payload.name,
      ad_groups,
      roles: resolveRoles(ad_groups, ROLE_MAPPER),
    };
    console.debug('auth success', { upn: req.user.upn, roles: req.user.roles });
    next();
  } catch {
    console.warn('auth failure', { reason: 'invalid', path: req.path, cid });
    return res.status(401).json({ error: 'unauthorized' });
  }
}

const allow = [/^\/auth\//, /^\/health$/, /^\/api-docs\//];
app.use((req, res, next) => {
  if (allow.some((r) => r.test(req.path))) return next();
  if (req.path.startsWith('/api/')) return authMiddleware(req as any, res, next);
  next();
});

app.use('/api', (req, res) => {
  proxy.web(req, res, { target: API_TARGET }, (err) => {
    console.warn('proxy error', err.message);
    res.status(502).end();
  });
});

const server = http.createServer(app);

function extractToken(req: http.IncomingMessage) {
  const proto = req.headers['sec-websocket-protocol'];
  if (proto) {
    const parts = proto.split(',').map((p) => p.trim());
    if (parts[0] === 'bearer' && parts[1]) return parts[1];
  }
  try {
    const url = new URL(req.url || '', 'http://localhost');
    const q = url.searchParams.get('token');
    if (q) return q;
  } catch {}
  return null;
}

server.on('upgrade', (req: AuthenticatedRequest, socket, head) => {
  if (!req.url || !req.url.startsWith('/rt')) {
    socket.destroy();
    return;
  }
  const token = extractToken(req);
  if (!token) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }
  try {
    const payload: any = verify(token);
    const ad_groups = Array.isArray(payload.ad_groups) ? payload.ad_groups : [];
    req.user = {
      upn: payload.upn || payload.sub,
      name: payload.name,
      ad_groups,
      roles: resolveRoles(ad_groups, ROLE_MAPPER),
    };
    console.debug('ws auth success', { upn: req.user.upn, roles: req.user.roles });
    proxy.ws(req, socket, head, { target: RT_TARGET });
  } catch {
    console.warn('ws auth failure', { path: req.url });
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`gateway listening on ${PORT}`);
});
