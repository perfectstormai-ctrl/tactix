-- Roster of schedulable members per operation
CREATE TABLE IF NOT EXISTS cp_roster (
  roster_id    UUID PRIMARY KEY,
  operation_id UUID NOT NULL REFERENCES operations(operation_id) ON DELETE CASCADE,
  user_upn     TEXT NOT NULL,
  role         TEXT NOT NULL,
  display_name TEXT,
  alt_name     TEXT,
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (operation_id, user_upn, role)
);
CREATE INDEX IF NOT EXISTS ix_cp_roster_op_role ON cp_roster(operation_id, role);

-- Shifts (variable length; server enforces policy; DB ensures times integrity)
CREATE TABLE IF NOT EXISTS cp_shifts (
  shift_id     UUID PRIMARY KEY,
  operation_id UUID NOT NULL REFERENCES operations(operation_id) ON DELETE CASCADE,
  user_upn     TEXT NOT NULL,
  role         TEXT NOT NULL,
  starts_at    TIMESTAMPTZ NOT NULL,
  ends_at      TIMESTAMPTZ NOT NULL,
  source       TEXT NOT NULL DEFAULT 'manual',
  notes        TEXT,
  created_by   TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS ix_cp_shifts_op_window
  ON cp_shifts(operation_id, starts_at, ends_at);

CREATE OR REPLACE FUNCTION trg_cp_shifts_touch_updated() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS cp_shifts_touch_updated ON cp_shifts;
CREATE TRIGGER cp_shifts_touch_updated BEFORE UPDATE ON cp_shifts
  FOR EACH ROW EXECUTE FUNCTION trg_cp_shifts_touch_updated();
