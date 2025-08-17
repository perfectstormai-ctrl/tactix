import express from 'express';
import { Pool } from 'pg';
import { PORT, PGURL, ORG_CODE } from './env.js';
import routes from './routes.js';

const app = express();
app.use(express.json());
export const pool = new Pool({ connectionString: PGURL });

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/', routes);

app.listen(PORT, () => console.log(`playbook-svc on :${PORT} org=${ORG_CODE}`));
