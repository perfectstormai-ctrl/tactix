const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`incident-svc listening on ${PORT}`));
