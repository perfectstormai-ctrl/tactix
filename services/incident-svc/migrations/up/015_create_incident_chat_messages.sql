CREATE TABLE IF NOT EXISTS incident_chat_messages (
  msg_id UUID PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
  author_upn TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_icm_incident_created
  ON incident_chat_messages(incident_id, created_at DESC);
