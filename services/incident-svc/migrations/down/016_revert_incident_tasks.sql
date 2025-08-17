ALTER TABLE IF EXISTS incident_tasks
  DROP COLUMN IF EXISTS assignee_upn,
  DROP COLUMN IF EXISTS title,
  DROP COLUMN IF EXISTS created_by,
  DROP COLUMN IF EXISTS updated_at;
ALTER TABLE IF EXISTS incident_tasks
  DROP CONSTRAINT IF EXISTS incident_tasks_status_check;
ALTER TABLE IF EXISTS incident_tasks
  ADD CONSTRAINT incident_tasks_status_check
    CHECK (status IN ('open','done','cancelled'));
ALTER TABLE IF EXISTS incident_tasks
  DROP CONSTRAINT IF EXISTS incident_tasks_incident_id_fkey;
DROP INDEX IF EXISTS ix_it_incident_status;
