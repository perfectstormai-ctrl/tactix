CREATE TABLE IF NOT EXISTS orders (
  order_id        UUID PRIMARY KEY,
  operation_id    UUID NOT NULL REFERENCES operations(operation_id) ON DELETE CASCADE,
  incident_id     UUID REFERENCES incidents(incident_id) ON DELETE SET NULL,
  order_type      TEXT NOT NULL CHECK (order_type IN ('OPORD','WARNORD','FRAGO')),
  title           TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('draft','in_review','published','archived')) DEFAULT 'draft',
  classification  TEXT NOT NULL DEFAULT 'UNCLASS',
  distribution    TEXT,
  current_version INT NOT NULL DEFAULT 1,
  created_by      TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_orders_op ON orders(operation_id, updated_at DESC);

CREATE OR REPLACE FUNCTION trg_orders_touch_updated() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS orders_touch_updated ON orders;
CREATE TRIGGER orders_touch_updated BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION trg_orders_touch_updated();

CREATE TABLE IF NOT EXISTS order_versions (
  order_id        UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  version         INT  NOT NULL,
  content_json    JSONB NOT NULL,
  changelog       TEXT,
  authored_by     TEXT NOT NULL,
  authored_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (order_id, version)
);

CREATE TABLE IF NOT EXISTS order_sections (
  order_id        UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  section_id      TEXT NOT NULL,
  title           TEXT NOT NULL,
  owner_role      TEXT,
  owner_upn       TEXT,
  edit_roles      TEXT[],
  view_roles      TEXT[],
  sort_index      INT NOT NULL DEFAULT 0,
  PRIMARY KEY (order_id, section_id)
);

CREATE TABLE IF NOT EXISTS order_collab_docs (
  order_id      UUID NOT NULL,
  section_id    TEXT NOT NULL,
  snapshot_ver  BIGINT NOT NULL DEFAULT 0,
  snapshot_data BYTEA,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (order_id, section_id)
);

CREATE TABLE IF NOT EXISTS order_collab_updates (
  order_id    UUID NOT NULL,
  section_id  TEXT NOT NULL,
  seq         BIGSERIAL PRIMARY KEY,
  update_data BYTEA NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_collab_updates_idx
  ON order_collab_updates(order_id, section_id, seq);

CREATE TABLE IF NOT EXISTS order_comments (
  comment_id   UUID PRIMARY KEY,
  order_id     UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  section_id   TEXT NOT NULL,
  anchor_json  JSONB NOT NULL,
  author_upn   TEXT NOT NULL,
  body         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved     BOOLEAN NOT NULL DEFAULT false,
  resolved_by  TEXT,
  resolved_at  TIMESTAMPTZ
);
