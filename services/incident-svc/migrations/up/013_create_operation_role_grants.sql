CREATE TABLE IF NOT EXISTS operation_role_grants (
  id UUID PRIMARY KEY,
  operation_id UUID NOT NULL REFERENCES operations(operation_id) ON DELETE CASCADE,
  user_upn TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('VIEWER','EDITOR','IMO','ADMIN')),
  alt_name TEXT,
  created_by_upn TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (operation_id, user_upn)
);
