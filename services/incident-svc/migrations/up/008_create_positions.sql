CREATE TABLE positions (
  position_id UUID PRIMARY KEY,
  operation_id UUID NOT NULL REFERENCES operations(operation_id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  UNIQUE (operation_id, code)
);

