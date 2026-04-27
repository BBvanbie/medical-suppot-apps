ALTER TABLE compliance_operation_runs
  ADD COLUMN IF NOT EXISTS organization_scope TEXT NOT NULL DEFAULT 'shared',
  ADD COLUMN IF NOT EXISTS organization_id BIGINT,
  ADD COLUMN IF NOT EXISTS supersedes_run_id BIGINT REFERENCES compliance_operation_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS evidence_type TEXT NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS evidence_reference TEXT,
  ADD COLUMN IF NOT EXISTS evidence_notes TEXT,
  ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

UPDATE compliance_operation_runs
SET retention_until = COALESCE(retention_until, completed_at + INTERVAL '5 years')
WHERE retention_until IS NULL;

ALTER TABLE compliance_operation_runs
  ALTER COLUMN retention_until SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'compliance_operation_runs_organization_scope_check'
  ) THEN
    ALTER TABLE compliance_operation_runs
      ADD CONSTRAINT compliance_operation_runs_organization_scope_check
      CHECK (organization_scope IN ('hospital', 'ems', 'admin', 'shared'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'compliance_operation_runs_evidence_type_check'
  ) THEN
    ALTER TABLE compliance_operation_runs
      ADD CONSTRAINT compliance_operation_runs_evidence_type_check
      CHECK (evidence_type IN ('document', 'folder', 'ticket', 'url', 'other'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_compliance_operation_runs_scope_completed
  ON compliance_operation_runs(organization_scope, organization_id, completed_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_compliance_operation_runs_retention
  ON compliance_operation_runs(retention_until ASC, archived_at ASC, id DESC);

CREATE INDEX IF NOT EXISTS idx_compliance_operation_runs_supersedes
  ON compliance_operation_runs(supersedes_run_id, id DESC);
