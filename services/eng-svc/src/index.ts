import express from 'express';
import { WebSocketServer } from 'ws';
import { connect, StringCodec, NatsConnection } from 'nats';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { createClient, Client } from '@tactix/lib-db';

const app = express();
app.use(express.json());

const orgCode = process.env.ORG_CODE || '';
const allowedRoles = (process.env.ENG_ALLOWED_ROLES || '').split(',');
const retentionHours = Number(process.env.ENG_RETENTION_HOURS || '48');
const instanceId = process.env.INSTANCE_ID || randomUUID();

let nc: NatsConnection | null = null;
const sc = StringCodec();
const wsClients = new Set<any>();

let db: Client | null = null;
if (process.env.DATABASE_URL) {
  db = createClient();
  db.connect().catch((err) => console.error('db connect failed', err));
}

async function connectNats() {
  try {
    nc = await connect({ servers: process.env.NATS_URL || 'nats://localhost:4222' });
    const sub = nc.subscribe(`eng.${orgCode}.*.chat`);
    (async () => {
      for await (const m of sub) {
        const msg = sc.decode(m.data);
        for (const ws of wsClients) {
          try {
            ws.send(msg);
          } catch {}
        }
      }
    })();
  } catch (err) {
    console.error('nats connect failed', err);
  }
}
connectNats();

function authenticate(req: any, res: any, next: any) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).end();
  const token = auth.replace('Bearer ', '');
  try {
    const payload: any = jwt.verify(token, process.env.JWT_PUBLIC_KEY || '');
    req.user = payload;
    const roles: string[] = payload.roles || [];
    if (!roles.some((r) => allowedRoles.includes(r))) {
      return res.status(403).end();
    }
    next();
  } catch {
    return res.status(401).end();
  }
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

const messageSchema = z.object({
  operationCode: z.string(),
  text: z.string(),
});

app.post('/eng/messages', authenticate, async (req: any, res) => {
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid' });
  const { operationCode, text } = parsed.data;
  const envelope = {
    orgCode,
    operationCode,
    fromInstanceId: instanceId,
    fromUser: { upn: req.user?.upn || '', display: req.user?.display || '' },
    text,
    sentAt: new Date().toISOString(),
    schema: 'engchat.v1',
  };
  if (nc) {
    await nc.publish(
      `eng.${orgCode}.${operationCode}.chat`,
      sc.encode(JSON.stringify(envelope))
    );
  }
  if (db) {
    await db
      .query(
        'INSERT INTO eng_messages(msg_id, org_code, operation_code, from_instance_id, from_user_upn, text) VALUES($1,$2,$3,$4,$5,$6)',
        [
          randomUUID(),
          orgCode,
          operationCode,
          instanceId,
          req.user?.upn || '',
          text,
        ]
      )
      .catch(() => {});
  }
  res.json({ ok: true });
});

app.get('/eng/messages', authenticate, async (req: any, res) => {
  const operationCode = req.query.operationCode as string;
  const since = req.query.since
    ? new Date(String(req.query.since))
    : new Date(Date.now() - retentionHours * 3600 * 1000);
  if (!operationCode || !db) return res.json([]);
  const { rows } = await db.query(
    'SELECT msg_id, org_code, operation_code, from_instance_id, from_user_upn, text, created_at FROM eng_messages WHERE org_code=$1 AND operation_code=$2 AND created_at >= $3 ORDER BY created_at DESC LIMIT 100',
    [orgCode, operationCode, since.toISOString()]
  );
  res.json(rows);
});

const server = app.listen(process.env.PORT || 3000, () => {
  console.log('eng-svc listening');
});

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  if (req.url === '/eng/ws') {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wsClients.add(ws);
      ws.on('close', () => wsClients.delete(ws));
    });
  } else {
    socket.destroy();
  }
});

setInterval(async () => {
  if (!db) return;
  await db
    .query('DELETE FROM eng_messages WHERE created_at < NOW() - INTERVAL ' + `'1 hour' * $1`, [retentionHours])
    .catch(() => {});
}, 60 * 60 * 1000);
