CREATE TABLE messages (
  message_id UUID PRIMARY KEY,
  operation_id UUID REFERENCES operations(operation_id),
  author_upn TEXT NOT NULL,
  recipient_scope TEXT NOT NULL,
  recipient_unit TEXT,
  status TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_messages_operation ON messages(operation_id);
