CREATE TABLE playbooks (
  playbook_id UUID PRIMARY KEY,
  incident_id UUID NOT NULL,
  name TEXT NOT NULL,
  json JSONB NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (incident_id, name)
);
