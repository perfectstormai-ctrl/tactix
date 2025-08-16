const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '../../ops/env/incident.env') });
} catch {}
let createClient;
try {
  ({ createClient } = require('@tactix/lib-db'));
} catch {
  const { Client } = require('pg');
  createClient = () => new Client({ connectionString: process.env.DATABASE_URL });
}

async function seed() {
  const client = createClient();
  await client.connect();
  try {
    const title = 'FOREST FIRE \u2013 LAC ST-JEAN';
    const description = 'Wildfire reported near Lac St-Jean. Evacuation ongoing.';
    const severity = 'high';

    const { rows } = await client.query(
      'INSERT INTO incidents (title, severity, description) VALUES ($1, $2, $3) RETURNING id',
      [title, severity, description]
    );
    const incidentId = rows[0].id;

    const logs = [
      '16:30 Smoke spotted from watchtower.',
      '16:45 Units dispatched to investigate.',
      '17:10 Fire confirmed, size approx 3ha.',
      '17:20 Evacuation of nearby campsite initiated.',
      '17:45 Aerial support requested.',
      '18:00 Firebreak construction underway.'
    ];

    for (const entry of logs) {
      await client.query(
        `INSERT INTO incident_events (incident_id, type, payload) VALUES ($1, 'COMMENT_ADDED', jsonb_build_object('comment', $2))`,
        [incidentId, entry]
      );
      await client.query(
        'UPDATE incidents SET comments = comments || $2::jsonb WHERE id = $1',
        [incidentId, JSON.stringify([entry])]
      );
    }
  } finally {
    await client.end();
  }
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
