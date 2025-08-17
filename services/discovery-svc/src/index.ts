import express from 'express';
import Bonjour from 'bonjour-service';
import dgram from 'dgram';
import { randomUUID, createHash, generateKeyPairSync, sign, verify } from 'crypto';
import fs from 'fs';
import path from 'path';

const PORT = Number(process.env.PORT || '3000');
const ANNOUNCE_PORT = Number(process.env.ANNOUNCE_PORT || PORT);
const NAME = process.env.NAME || 'tactix-server';
const VERSION = process.env.VERSION || '0.0.0';
const INSTANCE_ID = process.env.INSTANCE_ID || randomUUID();
const ROLE = 'server';

const KEYS_DIR = process.env.KEYS_DIR || '/data/keys';
const PRIV_PATH = path.join(KEYS_DIR, 'server.key');
const PUB_PATH = path.join(KEYS_DIR, 'server.pub');

if (!fs.existsSync(KEYS_DIR)) fs.mkdirSync(KEYS_DIR, { recursive: true });
if (!fs.existsSync(PRIV_PATH) || !fs.existsSync(PUB_PATH)) {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  fs.writeFileSync(PRIV_PATH, privateKey.export({ type: 'pkcs8', format: 'pem' }));
  fs.writeFileSync(PUB_PATH, publicKey.export({ type: 'spki', format: 'pem' }));
}

const privateKey = fs.readFileSync(PRIV_PATH);
const publicKey = fs.readFileSync(PUB_PATH).toString();
const fingerprint = createHash('sha256').update(publicKey).digest('hex');

function signRecord(rec: any) {
  const data = Buffer.from(JSON.stringify(rec));
  return sign(null, data, privateKey).toString('base64');
}

interface CacheEntry {
  id: string;
  name: string;
  url: string;
  fingerprint: string;
  seenAt: string;
}
const cache = new Map<string, CacheEntry>();

const app = express();
app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/discovery/servers', (_req, res) => {
  res.json(Array.from(cache.values()));
});
app.listen(PORT, () => {
  console.log(`discovery-svc listening on ${PORT}`);
});

const bonjour = new Bonjour();
bonjour.publish({
  name: NAME,
  type: '_tactix._tcp',
  port: ANNOUNCE_PORT,
  txt: { id: INSTANCE_ID, version: VERSION, fingerprint, role: ROLE },
});

const browser = bonjour.find({ type: '_tactix._tcp' });
browser.on('up', (service) => {
  const txt: any = service.txt || {};
  if (txt.role !== 'server') return;
  const url = `http://${service.referer.address}:${service.port}`;
  cache.set(txt.id, {
    id: txt.id,
    name: service.name,
    url,
    fingerprint: txt.fingerprint || '',
    seenAt: new Date().toISOString(),
  });
});

const udpAnnouncer = dgram.createSocket('udp4');
udpAnnouncer.bind(() => {
  udpAnnouncer.setBroadcast(true);
});
function broadcast() {
  const url = `http://${process.env.ANNOUNCE_HOST || 'localhost'}:${ANNOUNCE_PORT}`;
  const record = {
    id: INSTANCE_ID,
    name: NAME,
    url,
    version: VERSION,
    role: ROLE,
    fingerprint,
  };
  const sig = signRecord(record);
  const payload = { ...record, pubKey: publicKey, sig };
  udpAnnouncer.send(Buffer.from(JSON.stringify(payload)), 57321, '255.255.255.255');
}
setInterval(broadcast, 3000);
broadcast();

const udpListener = dgram.createSocket('udp4');
udpListener.on('message', (msg) => {
  try {
    const obj = JSON.parse(msg.toString());
    const { id, name, url, version, role, fingerprint: fp, pubKey, sig } = obj;
    if (role !== 'server') return;
    const rec = { id, name, url, version, role, fingerprint: fp };
    const fpCheck = createHash('sha256').update(pubKey).digest('hex');
    const ok = fpCheck === fp && verify(null, Buffer.from(JSON.stringify(rec)), pubKey, Buffer.from(sig, 'base64'));
    if (ok) {
      cache.set(id, {
        id,
        name,
        url,
        fingerprint: fp,
        seenAt: new Date().toISOString(),
      });
    }
  } catch {
    // ignore
  }
});
udpListener.bind(57321);
