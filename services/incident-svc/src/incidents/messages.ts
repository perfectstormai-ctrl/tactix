import { randomUUID } from 'node:crypto';
import { logWarlog } from '../warlog.js';
type Client = any;

export interface Message {
  id: string;
  incident_id: number;
  author: string;
  content: string;
  status: 'draft' | 'submitted';
  created_at: Date;
}

export async function saveDraft(
  client: Client,
  incidentId: number,
  content: string,
  author: string
): Promise<Message> {
  const { rows } = await client.query(
    'INSERT INTO messages (id, incident_id, author, content, status) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [randomUUID(), incidentId, author, content, 'draft']
  );
  return rows[0];
}

export async function submitMessage(
  client: Client,
  incidentId: number,
  messageId: string
): Promise<Message | null> {
  const { rows } = await client.query(
    'UPDATE messages SET status=$1 WHERE id=$2 AND incident_id=$3 RETURNING *',
    ['submitted', messageId, incidentId]
  );
  const msg = rows[0];
  if (msg) {
    try {
      await logWarlog(msg.author, msg.content);
    } catch (_) {}
  }
  return msg || null;
}
