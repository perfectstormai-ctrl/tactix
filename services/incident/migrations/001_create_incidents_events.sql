CREATE TABLE IF NOT EXISTS incidents_events (
  id UUID PRIMARY KEY,
  incident_id UUID NOT NULL,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS incidents_events_incident_id_idx
  ON incidents_events (incident_id, timestamp);
