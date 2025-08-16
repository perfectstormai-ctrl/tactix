CREATE TABLE org_units (
  org_unit_id UUID PRIMARY KEY,
  operation_id UUID REFERENCES operations(operation_id),
  scope TEXT NOT NULL,
  unit_name TEXT NOT NULL,
  xmpp_jid TEXT
);
CREATE INDEX idx_org_units_operation ON org_units(operation_id);
