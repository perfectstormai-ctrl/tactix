const express = require('express');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(express.json());

app.get('/health', (_req, res) => res.send('incident ok'));

// Fetch operation details including units, warlog entries, and XMPP info
app.get('/operations/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows: ops } = await pool.query(
      'SELECT id, name, xmpp_host, xmpp_room, campaign_id FROM operations WHERE id=$1',
      [id]
    );
    if (ops.length === 0) {
      return res.status(404).json({ error: 'operation not found' });
    }
    const operation = ops[0];
    const { rows: units } = await pool.query(
      'SELECT id, name FROM units WHERE operation_id=$1 ORDER BY name',
      [id]
    );
    const { rows: warlog } = await pool.query(
      'SELECT id, ts, author, message FROM warlog_entries WHERE operation_id=$1 ORDER BY ts DESC',
      [id]
    );
    res.json({ operation, units, warlog });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'database error' });
  }
});

// List incidents with optional status and title query
app.get('/incidents', async (req, res) => {
  const { status, q } = req.query;
  let sql =
    'SELECT id, title, description, status, created_at, updated_at FROM incidents';
  const params = [];
  const conditions = [];
  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    conditions.push(`title ILIKE $${params.length}`);
  }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY created_at DESC';
  try {
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'database error' });
  }
});

// Get full incident with comments and attachments
app.get('/incidents/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows: incidents } = await pool.query(
      'SELECT id, title, description, status, created_at, updated_at FROM incidents WHERE id=$1',
      [id]
    );
    if (incidents.length === 0) {
      return res.status(404).json({ error: 'incident not found' });
    }
    const incident = incidents[0];
    const { rows: comments } = await pool.query(
      'SELECT id, author, comment, created_at FROM incident_comments WHERE incident_id=$1 ORDER BY created_at ASC',
      [id]
    );
    const { rows: attachments } = await pool.query(
      'SELECT id, filename, url, created_at FROM incident_attachments WHERE incident_id=$1 ORDER BY created_at ASC',
      [id]
    );
    res.json({ incident, comments, attachments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'database error' });
  }
});

// Create a new incident
app.post('/incidents', async (req, res) => {
  const { title, description } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'INSERT INTO incidents(title, description, status) VALUES($1,$2,$3) RETURNING id',
      [title, description, 'open']
    );
    const id = rows[0].id;
    await client.query(
      'INSERT INTO incident_events(incident_id, type, data) VALUES($1,$2,$3)',
      [id, 'incident_created', { title, description }]
    );
    await client.query('COMMIT');
    res.status(201).json({ id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'database error' });
  } finally {
    client.release();
  }
});

// Add a comment to an incident
app.post('/incidents/:id/comment', async (req, res) => {
  const { id } = req.params;
  const { author, comment } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rowCount } = await client.query('SELECT 1 FROM incidents WHERE id=$1', [id]);
    if (rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'incident not found' });
    }
    const { rows } = await client.query(
      'INSERT INTO incident_comments(incident_id, author, comment) VALUES($1,$2,$3) RETURNING id',
      [id, author, comment]
    );
    await client.query(
      'INSERT INTO incident_events(incident_id, type, data) VALUES($1,$2,$3)',
      [id, 'comment_added', { author, comment }]
    );
    await client.query('UPDATE incidents SET updated_at=now() WHERE id=$1', [id]);
    await client.query('COMMIT');
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'database error' });
  } finally {
    client.release();
  }
});

// Update status of an incident
app.post('/incidents/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rowCount } = await client.query(
      'UPDATE incidents SET status=$1, updated_at=now() WHERE id=$2',
      [status, id]
    );
    if (rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'incident not found' });
    }
    await client.query(
      'INSERT INTO incident_events(incident_id, type, data) VALUES($1,$2,$3)',
      [id, 'status_changed', { status }]
    );
    await client.query('COMMIT');
    res.json({ status });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'database error' });
  } finally {
    client.release();
  }
});

// Attach a file to an incident (stubbed storage)
app.post('/incidents/:id/attachments', async (req, res) => {
  const { id } = req.params;
  const { filename } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rowCount } = await client.query('SELECT 1 FROM incidents WHERE id=$1', [id]);
    if (rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'incident not found' });
    }
    const { rows } = await client.query(
      'INSERT INTO incident_attachments(incident_id, filename, url) VALUES($1,$2,$3) RETURNING id',
      [id, filename, null]
    );
    await client.query(
      'INSERT INTO incident_events(incident_id, type, data) VALUES($1,$2,$3)',
      [id, 'attachment_added', { filename }]
    );
    await client.query('UPDATE incidents SET updated_at=now() WHERE id=$1', [id]);
    await client.query('COMMIT');
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'database error' });
  } finally {
    client.release();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`incident-svc listening on ${PORT}`));
