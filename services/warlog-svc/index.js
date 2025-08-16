const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Ensure table exists
async function init() {
  await pool.query(`CREATE TABLE IF NOT EXISTS warlog (
    id SERIAL PRIMARY KEY,
    author TEXT NOT NULL DEFAULT 'anonymous',
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`);
}
init().catch(err => {
  console.error('Failed to initialize database', err);
  process.exit(1);
});

app.get('/health', (_req, res) => res.send('warlog ok'));

app.get('/entries', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, author, content, created_at FROM warlog ORDER BY created_at ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to fetch warlog entries' });
  }
});

app.post('/entries', async (req, res) => {
  const { author = 'anonymous', content } = req.body;
  if (!content) {
    return res.status(400).json({ error: 'content required' });
  }
  try {
    const { rows } = await pool.query(
      'INSERT INTO warlog (author, content) VALUES ($1, $2) RETURNING id, author, content, created_at',
      [author, content]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to create warlog entry' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`warlog-svc listening on ${PORT}`));
