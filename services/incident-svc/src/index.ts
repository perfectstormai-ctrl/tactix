import express from 'express';
import fs from 'fs';
import path from 'path';
import { createClient, runMigrations } from '@tactix/lib-db';
import { Incident } from '@tactix/types';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const client = createClient();

async function main() {
  await client.connect();

  const migrationsDir = path.join(__dirname, 'migrations');
  if (fs.existsSync(migrationsDir)) {
    await runMigrations(client, migrationsDir);
  }

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/incidents', (_req, res) => {
    const incidents: Incident[] = [];
    res.json(incidents);
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`incident-svc listening on ${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
