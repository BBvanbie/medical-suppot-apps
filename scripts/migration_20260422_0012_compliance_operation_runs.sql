CREATE TABLE IF NOT EXISTS compliance_operation_runs (
  id BIGSERIAL PRIMARY KEY,
  operation_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'needs_followup')),
  completed_at TIMESTAMPTZ NOT NULL,
  next_due_at TIMESTAMPTZ,
  evidence_location TEXT,
  notes TEXT,
  reported_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT compliance_operation_runs_operation_key_check CHECK (
    operation_key IN (
      'id_inventory',
      'audit_review',
      'restore_drill',
      'asset_training',
      'vendor_review',
      'network_review'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_compliance_operation_runs_operation_completed
  ON compliance_operation_runs(operation_key, completed_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_compliance_operation_runs_next_due
  ON compliance_operation_runs(next_due_at ASC, id DESC);

CREATE INDEX IF NOT EXISTS idx_compliance_operation_runs_created
  ON compliance_operation_runs(created_at DESC, id DESC);
