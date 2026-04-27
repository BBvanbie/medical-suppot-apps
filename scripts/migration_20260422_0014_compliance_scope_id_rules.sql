DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'compliance_operation_runs_scope_id_rule_check'
  ) THEN
    ALTER TABLE compliance_operation_runs
      DROP CONSTRAINT compliance_operation_runs_scope_id_rule_check;
  END IF;
END $$;

ALTER TABLE compliance_operation_runs
  ADD CONSTRAINT compliance_operation_runs_scope_id_rule_check
  CHECK (
    (organization_scope IN ('hospital', 'ems') AND organization_id IS NOT NULL)
    OR (organization_scope IN ('admin', 'shared') AND organization_id IS NULL)
  );
