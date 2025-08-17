-- Add fields to incident_tasks if table exists
ALTER TABLE IF EXISTS incident_tasks
  ADD COLUMN IF NOT EXISTS assignee_upn TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS created_by TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Update status constraint
ALTER TABLE IF EXISTS incident_tasks
  DROP CONSTRAINT IF EXISTS incident_tasks_status_check;
ALTER TABLE IF EXISTS incident_tasks
  ADD CONSTRAINT incident_tasks_status_check
    CHECK (status IN ('open','in_progress','done','cancelled'));

-- Add foreign key to incidents
ALTER TABLE IF EXISTS incident_tasks
  DROP CONSTRAINT IF EXISTS incident_tasks_incident_id_fkey;
ALTER TABLE IF EXISTS incident_tasks
  ADD CONSTRAINT incident_tasks_incident_id_fkey
    FOREIGN KEY (incident_id) REFERENCES incidents(incident_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS ix_it_incident_status
  ON incident_tasks(incident_id, status, updated_at DESC);
