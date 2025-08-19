CREATE TABLE IF NOT EXISTS security_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  zero_trust_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by VARCHAR(128)
);

INSERT INTO security_settings (id, zero_trust_enabled)
VALUES (1, FALSE)
ON CONFLICT (id) DO NOTHING;
