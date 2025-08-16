const { createClient } = require('redis');
const fs = require('fs');
const path = require('path');

const stream = process.argv[2];
if (!stream) {
  console.error('usage: node stream-consumer.js <stream>');
  process.exit(1);
}

const lastIdFile = path.join(__dirname, `${stream.replace(/[.:]/g, '_')}.lastid`);

(async () => {
  const client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  client.on('error', err => console.error('redis error', err));
  await client.connect();

  let lastId = '0-0';
  if (fs.existsSync(lastIdFile)) {
    lastId = fs.readFileSync(lastIdFile, 'utf8');
  }

  while (true) {
    const data = await client.xRead(
      [{ key: stream, id: lastId }],
      { BLOCK: 5000 }
    );
    if (data) {
      const messages = data[0].messages;
      for (const m of messages) {
        console.log(`[${m.id}]`, m.message.message);
        lastId = m.id;
      }
      fs.writeFileSync(lastIdFile, lastId);
    }
  }
})();
