CREATE TABLE role_grants (
  grant_id UUID PRIMARY KEY,
  operation_id UUID NOT NULL REFERENCES operations(operation_id) ON DELETE CASCADE,
  user_upn TEXT NOT NULL,
  role TEXT NOT NULL,
  created_by_upn TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (operation_id, user_upn, role),
  CHECK (role IN ('READ','ASSIGN','WRITE','APPROVE'))
);

