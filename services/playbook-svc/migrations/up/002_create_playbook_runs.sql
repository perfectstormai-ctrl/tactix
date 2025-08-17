CREATE TABLE playbook_runs (
  run_id UUID PRIMARY KEY,
  playbook_id UUID NOT NULL REFERENCES playbooks(playbook_id) ON DELETE CASCADE,
  incident_id UUID NOT NULL,
  requested_by TEXT NOT NULL,
  approved_by TEXT,
  status TEXT CHECK (status IN ('suggested','approved','executed','failed')) NOT NULL,
  overrides JSONB,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  executed_at TIMESTAMPTZ
);
