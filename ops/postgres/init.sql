-- Database initialization for campaigns, operations, units, incidents, and warlog entries
CREATE TABLE IF NOT EXISTS campaigns (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS incidents (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT
);

-- Seed initial incident for development/testing
INSERT INTO incidents (title, description)
VALUES ('Fire in Building', 'Report of a fire at the warehouse');

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
