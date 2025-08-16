CREATE TABLE IF NOT EXISTS eng_messages(
  msg_id UUID PRIMARY KEY,
  org_code TEXT NOT NULL,
  operation_code TEXT NOT NULL,
  from_instance_id TEXT NOT NULL,
  from_user_upn TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_eng_1 ON eng_messages(org_code, operation_code, created_at);
