CREATE TABLE incident_tasks (
  task_id UUID PRIMARY KEY,
  incident_id UUID NOT NULL,
  role TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT CHECK (status IN ('open','done','cancelled')) DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now()
);
