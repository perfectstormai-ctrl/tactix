import express, { type Request, type Response } from 'express';
import Bonjour from 'bonjour-service';
import { promises as fs } from 'fs';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import QRCode from 'qrcode';

const PORT = Number(process.env.PORT) || 3010;
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;
const SERVER_NAME = process.env.SERVER_NAME || 'tactix-server';
const INVITE_TTL_HOURS = Number(process.env.DISCOVERY_INVITE_TTL_HOURS || '24');
const KEY_DIR = process.env.DISCOVERY_KEYS_DIR || '/data/discovery/keys';

const app = express();
app.use(express.json());

const bonjour = new Bonjour();

interface ServerInfo {
  serverId: string;
  name: string;
  url: string;
  tls: boolean;
  fingerprint: string;
  lastSeen: number;
  source: 'mdns';
}

const discovered = new Map<string, ServerInfo>();
let ad: ReturnType<typeof bonjour.publish> | null = null;

let keys: { publicKey: string; privateKey: string };
let fingerprint = '';
let serverId = '';

async function initKeys(): Promise<void> {
  if (!existsSync(KEY_DIR)) {
    mkdirSync(KEY_DIR, { recursive: true, mode: 0o700 });
  }
  const privPath = path.join(KEY_DIR, 'ed25519.private');
  const pubPath = path.join(KEY_DIR, 'ed25519.public');
  try {
    const [priv, pub] = await Promise.all([
      fs.readFile(privPath, 'utf8'),
      fs.readFile(pubPath, 'utf8')
    ]);
    keys = { privateKey: priv, publicKey: pub };
  } catch {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const priv = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
    const pub = publicKey.export({ format: 'pem', type: 'spki' }).toString();
    await fs.writeFile(privPath, priv, { mode: 0o600 });
    await fs.writeFile(pubPath, pub, { mode: 0o600 });
    keys = { privateKey: priv, publicKey: pub };
  }
  fingerprint = crypto.createHash('sha256').update(keys.publicKey).digest('hex');
  serverId = crypto.createHash('sha256').update(keys.publicKey).digest('hex').slice(0, 16);
}

function startBrowse(): void {
  bonjour.find({ type: 'tactix' }, (service) => {
    const id = (service.txt?.id as string) || service.name;
    const fp = (service.txt?.fp as string) || '';
    const tls = service.txt?.tls === 'true';
    const url = `http://${service.referer.address}:${service.port}`;
    discovered.set(id, {
      serverId: id,
      name: service.name,
      url,
      tls,
      fingerprint: fp,
      lastSeen: Date.now(),
      source: 'mdns'
    });
  });
}

function prune(): void {
  const now = Date.now();
  for (const [id, info] of discovered) {
    if (now - info.lastSeen > 60_000) {
      discovered.delete(id);
    }
  }
}
const pruneInterval = setInterval(prune, 30_000);

function announce(): void {
  if (ad) return;
  const url = new URL(SERVER_URL);
  const port = Number(url.port || PORT);
  ad = bonjour.publish({
    name: SERVER_NAME,
    type: 'tactix',
    port,
    txt: { id: serverId, role: 'server', ver: '1.0.0', fp: fingerprint, tls: 'false' }
  });
  discovered.set(serverId, {
    serverId,
    name: SERVER_NAME,
    url: SERVER_URL,
    tls: false,
    fingerprint,
    lastSeen: Date.now(),
    source: 'mdns'
  });
}

function stopAnnounce(): void {
  if (ad) {
    ad.stop();
    ad = null;
  }
}

export async function createInvite(customExp?: number): Promise<{ invite: string; qrPng: string }> {
  const exp = customExp ?? Date.now() + INVITE_TTL_HOURS * 3_600_000;
  const payload = { serverId, url: SERVER_URL, fingerprint, exp };
  const sig = crypto.sign(null, Buffer.from(JSON.stringify(payload)), keys.privateKey).toString('base64');
  const inviteObj = { ...payload, sig };
  const invite = Buffer.from(JSON.stringify(inviteObj)).toString('base64');
  const qrPng = (await QRCode.toDataURL(invite)).split(',')[1];
  return { invite, qrPng };
}

app.get('/discovery/health', (_req: Request, res: Response) => {
  res.json({ ok: true, ts: Date.now() });
});

app.get('/discovery/servers', (_req: Request, res: Response) => {
  prune();
  res.json([...discovered.values()]);
});

app.post('/discovery/announce', (_req: Request, res: Response) => {
  announce();
  res.json({ ok: true });
});

app.delete('/discovery/announce', (_req: Request, res: Response) => {
  stopAnnounce();
  res.json({ ok: true });
});

app.get('/discovery/invite', async (_req: Request, res: Response) => {
  res.json(await createInvite());
});

app.post('/discovery/verify-invite', (req: Request, res: Response) => {
  const { invite } = req.body as { invite?: string };
  if (!invite) {
    res.status(400).json({ ok: false, error: 'invite required' });
    return;
  }
  try {
    const decoded = JSON.parse(Buffer.from(invite, 'base64').toString('utf8')) as {
      serverId: string;
      url: string;
      fingerprint: string;
      exp: number;
      sig: string;
    };
    const payload = {
      serverId: decoded.serverId,
      url: decoded.url,
      fingerprint: decoded.fingerprint,
      exp: decoded.exp
    };
    const valid = crypto.verify(
      null,
      Buffer.from(JSON.stringify(payload)),
      keys.publicKey,
      Buffer.from(decoded.sig, 'base64')
    );
    if (!valid) {
      res.json({ ok: false, error: 'invalid-signature' });
      return;
    }
    if (Date.now() > decoded.exp) {
      res.json({ ok: false, error: 'expired' });
      return;
    }
    res.json({ ok: true, ...payload });
  } catch {
    res.status(400).json({ ok: false, error: 'invalid-invite' });
  }
});

function shutdown(): void {
  stopAnnounce();
  bonjour.destroy();
  clearInterval(pruneInterval);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  initKeys().then(() => {
    startBrowse();
    app.listen(PORT, () => {
      console.log(`discovery-svc listening on ${PORT}`);
    });
  });
} else {
  await initKeys();
  startBrowse();
}

export { app as default, shutdown };
