const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const Minio = require('minio');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const upload = multer({ storage: multer.memoryStorage() });

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'minio',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || '',
  secretKey: process.env.MINIO_SECRET_KEY || '',
});
const ATTACH_BUCKET = process.env.MINIO_BUCKET || 'attachments';

async function init() {
  try {
    const exists = await minioClient.bucketExists(ATTACH_BUCKET);
    if (!exists) {
      await minioClient.makeBucket(ATTACH_BUCKET);
    }
  } catch (err) {
    console.error('Failed to ensure bucket', err);
    process.exit(1);
  }
}
init();

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

app.post('/attachments', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'file required' });
  }
  const { originalname, mimetype, size, buffer } = req.file;
  const objectKey = `${Date.now()}_${originalname}`;
  try {
    await minioClient.putObject(ATTACH_BUCKET, objectKey, buffer, size);
    const { rows } = await pool.query(
      'INSERT INTO attachments (object_key, filename, mimetype, size) VALUES ($1,$2,$3,$4) RETURNING id, object_key, filename, mimetype, size, created_at',
      [objectKey, originalname, mimetype, size]
    );
    const metadata = rows[0];
    app.emit('ATTACHMENT_ADDED', metadata);
    res.status(201).json(metadata);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to upload attachment' });
  }
});

app.on('ATTACHMENT_ADDED', data => console.log('ATTACHMENT_ADDED', data));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`incident-svc listening on ${PORT}`));
