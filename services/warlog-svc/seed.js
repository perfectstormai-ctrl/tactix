const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '../../ops/env/warlog.env') });
} catch {}
const { Pool } = require('pg');

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS warlog (
      id SERIAL PRIMARY KEY,
      author TEXT NOT NULL DEFAULT 'anonymous',
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`);

    const lines = [
      '16:30 Smoke spotted from watchtower.',
      '16:45 Units dispatched to investigate.',
      '17:10 Fire confirmed, size approx 3ha.',
      '17:20 Evacuation of nearby campsite initiated.',
      '17:45 Aerial support requested.',
      '18:00 Firebreak construction underway.'
    ];

    for (const content of lines) {
      await pool.query('INSERT INTO warlog (author, content) VALUES ($1, $2)', ['system', content]);
    }
  } finally {
    await pool.end();
  }
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
