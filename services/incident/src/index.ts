import { Pool } from 'pg';
import { createApp } from './api.js';
import { PgEventStore } from './infrastructure/EventStore.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const store = new PgEventStore(pool);
const app = createApp(store);
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

app.listen(port, () => {
  console.log(`incident service listening on ${port}`);
});
