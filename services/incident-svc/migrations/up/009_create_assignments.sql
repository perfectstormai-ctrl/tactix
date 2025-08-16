CREATE TABLE assignments (
  assignment_id UUID PRIMARY KEY,
  operation_id UUID NOT NULL REFERENCES operations(operation_id) ON DELETE CASCADE,
  user_upn TEXT NOT NULL,
  position_id UUID REFERENCES positions(position_id),
  alt_display_name TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_by_upn TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON assignments (operation_id, user_upn);

