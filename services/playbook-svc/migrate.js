import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pkg from 'pg';

const { Client } = pkg;

async function main() {
  const direction = process.argv[2];
  if (!direction || !['up', 'down'].includes(direction)) {
    console.error('Usage: pnpm migrate up|down');
    process.exit(1);
  }
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const migrationsDir = path.join(__dirname, 'migrations', direction);
  const files = fs.existsSync(migrationsDir)
    ? fs.readdirSync(migrationsDir).sort()
    : [];
  const client = new Client({ connectionString: process.env.PGURL });
  await client.connect();
  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(sql);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
