const { createClient } = require('redis');

const stream = process.argv[2];
if (!stream) {
  console.error('usage: node stream-producer.js <stream> [message]');
  process.exit(1);
}

const message = process.argv[3] || `msg ${Date.now()}`;

(async () => {
  const client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  client.on('error', err => console.error('redis error', err));
  await client.connect();
  const id = await client.xAdd(stream, '*', { message });
  console.log(`added ${id} to ${stream}`);
  await client.quit();
})();
