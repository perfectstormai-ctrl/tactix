const path = require('path');
const { createClient, runMigrations } = require('@tactix/lib-db');

async function main() {
  const client = createClient();
  await client.connect();
  await runMigrations(client, path.join(__dirname, 'migrations'));
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
