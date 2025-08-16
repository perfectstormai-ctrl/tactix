CREATE TABLE approvals (
  id BIGSERIAL PRIMARY KEY,
  incident_id BIGINT REFERENCES incidents(id),
  user_id BIGINT REFERENCES users(id),
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
