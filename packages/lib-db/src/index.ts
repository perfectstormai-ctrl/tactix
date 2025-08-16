import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

export { Client };

export function createClient(): Client {
  return new Client({
    connectionString: process.env.DATABASE_URL,
  });
}

export async function runMigrations(client: Client, migrationsDir: string): Promise<void> {
  const files = fs.existsSync(migrationsDir)
    ? fs.readdirSync(migrationsDir).sort()
    : [];
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await client.query(sql);
  }
}
