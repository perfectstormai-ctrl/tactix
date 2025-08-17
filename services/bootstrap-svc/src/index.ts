import express, { type Request, type Response } from 'express';
import os, { networkInterfaces } from 'os';
import { promises as fs } from 'fs';
import { z } from 'zod';

const app = express();
const PORT = Number(process.env.PORT) || 3007;
const CONFIG_PATH = '/data/tactix.config.json';

app.use(express.json());

app.get('/bootstrap/health', (_req: Request, res: Response) => {
  res.json({ ok: true, ts: Date.now() });
});

app.get('/bootstrap/config', async (_req: Request, res: Response) => {
  res.json(await readConfig());
});

app.post('/bootstrap/config', async (req: Request, res: Response) => {
  await writeConfig(req.body);
  res.json({ applied: true });
});

app.get('/bootstrap/probe', async (_req: Request, res: Response) => {
  const cpu = { cores: os.cpus().length };
  const memory = { total: os.totalmem(), free: os.freemem() };
  const fsStat = await fs.statfs('/');
  const disk = {
    total: fsStat.bsize * fsStat.blocks,
    free: fsStat.bsize * fsStat.bavail
  };
  const osInfo = { platform: os.platform(), release: os.release() };
  const nets = networkInterfaces();
  const net = Object.entries(nets).flatMap(([iface, addrs]) =>
    (addrs ?? [])
      .filter((a): a is os.NetworkInterfaceInfo => a.family === 'IPv4' && !a.internal)
      .map(a => ({ iface, ip: a.address }))
  );
  const { score, rationale } = computeScore(cpu, memory, disk);
  res.json({ cpu, memory, disk, os: osInfo, net, score, rationale });
});

app.listen(PORT, () => {
  console.log(`bootstrap-svc listening on ${PORT}`);
});

const ConfigSchema = z.object({
  mode: z.enum(['single', 'server', 'client']),
  ldap: z.record(z.any()),
  discovery: z.object({
    lan: z.boolean(),
    cloud: z.boolean()
  }),
  server: z.object({
    announce: z.boolean()
  }),
  pinnedServers: z.array(z.object({
    id: z.string(),
    fingerprint: z.string(),
    url: z.string(),
    addedAt: z.string()
  }))
});

type Config = z.infer<typeof ConfigSchema>;

const defaultConfig = (): Config => ({
  mode: 'single',
  ldap: {},
  discovery: { lan: true, cloud: false },
  server: { announce: true },
  pinnedServers: []
});

async function readConfig(): Promise<Config> {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf8');
    return ConfigSchema.parse(JSON.parse(data));
  } catch {
    return defaultConfig();
  }
}

async function writeConfig(cfg: unknown): Promise<void> {
  const parsed = ConfigSchema.parse(cfg);
  const tmp = `${CONFIG_PATH}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(parsed, null, 2));
  await fs.rename(tmp, CONFIG_PATH);
}

type CPU = { cores: number };
type Memory = { total: number; free: number };
type Disk = { total: number; free: number };

function computeScore(cpu: CPU, memory: Memory, disk: Disk): { score: string; rationale: string[] } {
  const rationale: string[] = [];
  let score: 'good' | 'ok' | 'poor' = 'good';

  if (cpu.cores < 2) {
    score = 'ok';
    rationale.push('Low CPU core count');
  }
  if (memory.free / memory.total < 0.2) {
    score = 'ok';
    rationale.push('Low free memory');
  }
  if (disk.free / disk.total < 0.1) {
    score = 'poor';
    rationale.push('Low disk space');
  }
  if (rationale.length === 0) {
    rationale.push('System resources sufficient');
  }
  return { score, rationale };
}
