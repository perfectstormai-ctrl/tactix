CREATE TABLE incidents (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  title TEXT NOT NULL,
  severity TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  comments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
