-- Database initialization for campaigns, operations, units, and warlog entries
CREATE TABLE IF NOT EXISTS campaigns (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS operations (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER REFERENCES campaigns(id),
  name TEXT NOT NULL,
  xmpp_host TEXT,
  xmpp_room TEXT
);

CREATE TABLE IF NOT EXISTS units (
  id SERIAL PRIMARY KEY,
  operation_id INTEGER REFERENCES operations(id),
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS warlog_entries (
  id SERIAL PRIMARY KEY,
  operation_id INTEGER REFERENCES operations(id),
  unit_id INTEGER REFERENCES units(id),
  ts TIMESTAMPTZ DEFAULT now(),
  author TEXT,
  message TEXT
);

-- Event log for incident writes
CREATE TABLE IF NOT EXISTS incident_events (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  data JSONB NOT NULL,
  ts TIMESTAMPTZ DEFAULT now()
);

-- Incident projection table
CREATE TABLE IF NOT EXISTS incidents (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Projection for comments on incidents
CREATE TABLE IF NOT EXISTS incident_comments (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES incidents(id),
  author TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Projection for attachments (currently stubbed)
CREATE TABLE IF NOT EXISTS incident_attachments (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES incidents(id),
  filename TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
