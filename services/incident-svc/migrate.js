const path = require('path');
const { createClient, runMigrations } = require('@tactix/lib-db');

async function main() {
  const direction = process.argv[2];
  if (!direction || !['up', 'down'].includes(direction)) {
    console.error('Usage: pnpm migrate up|down');
    process.exit(1);
  }
  const migrationsDir = path.join(__dirname, 'migrations', direction);
  const client = createClient();
  await client.connect();
  try {
    await runMigrations(client, migrationsDir);
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
