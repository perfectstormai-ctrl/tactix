require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const { Client } = require('@opensearch-project/opensearch');

const app = express();
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
let osClient = null;

// Ensure table and OpenSearch index exist
async function init() {
  await pool.query(`CREATE TABLE IF NOT EXISTS warlog (
    id SERIAL PRIMARY KEY,
    author TEXT NOT NULL DEFAULT 'anonymous',
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`);

  try {
    osClient = new Client({ node: process.env.OPENSEARCH_URL || 'http://opensearch:9200' });
    await osClient.ping();
    await osClient.indices.create({ index: 'warlog' }, { ignore: [400] });
    console.log('Connected to OpenSearch');
  } catch (err) {
    osClient = null;
    console.warn('OpenSearch unavailable, falling back to Postgres search');
  }
}

init().catch(err => {
  console.error('Failed to initialize', err);
  process.exit(1);
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/entries', async (req, res) => {
  const { q } = req.query;
  try {
    if (q && osClient) {
      const result = await osClient.search({
        index: 'warlog',
        body: { query: { match: { content: q } } }
      });
      const hits = result.hits.hits.map(h => ({
        id: Number(h._id),
        author: h._source.author,
        content: h._source.content,
        created_at: h._source.created_at
      }));
      return res.json(hits);
    }

    const query = q
      ? {
          text: 'SELECT id, author, content, created_at FROM warlog WHERE content ILIKE $1 ORDER BY created_at ASC',
          params: [`%${q}%`]
        }
      : {
          text: 'SELECT id, author, content, created_at FROM warlog ORDER BY created_at ASC',
          params: []
        };
    const { rows } = await pool.query(query.text, query.params);
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
    const entry = rows[0];

    if (osClient) {
      await osClient.index({
        index: 'warlog',
        id: String(entry.id),
        body: entry
      });
    }

    res.status(201).json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to create warlog entry' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`warlog-svc listening on ${PORT}`));
