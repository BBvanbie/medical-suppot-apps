CREATE TABLE IF NOT EXISTS compliance_operating_units (
  id BIGSERIAL PRIMARY KEY,
  scope TEXT NOT NULL,
  unit_code TEXT NOT NULL,
  display_label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'compliance_operating_units_scope_check'
  ) THEN
    ALTER TABLE compliance_operating_units
      ADD CONSTRAINT compliance_operating_units_scope_check
      CHECK (scope IN ('admin', 'shared'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_compliance_operating_units_scope_code_unique
  ON compliance_operating_units(scope, unit_code);

CREATE INDEX IF NOT EXISTS idx_compliance_operating_units_scope_active
  ON compliance_operating_units(scope, is_active, display_label, id DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'compliance_organization_registry_scope_id_check'
  ) THEN
    ALTER TABLE compliance_organization_registry
      DROP CONSTRAINT compliance_organization_registry_scope_id_check;
  END IF;
END $$;

INSERT INTO compliance_operating_units (scope, unit_code, display_label, is_active)
VALUES
  ('admin', 'admin_default', '運用管理共通', TRUE),
  ('shared', 'shared_default', '全体共通', TRUE)
ON CONFLICT (scope, unit_code) DO NOTHING;

UPDATE compliance_organization_registry AS reg
SET
  organization_id = unit.id,
  display_label = unit.display_label,
  source_table = 'compliance_operating_units',
  is_active = unit.is_active,
  updated_at = NOW()
FROM compliance_operating_units AS unit
WHERE reg.organization_scope = unit.scope
  AND reg.organization_id IS NULL;

ALTER TABLE compliance_organization_registry
  ADD CONSTRAINT compliance_organization_registry_scope_id_check
  CHECK (organization_id IS NOT NULL);

INSERT INTO compliance_organization_registry (organization_scope, organization_id, display_label, source_table, is_active)
SELECT unit.scope, unit.id, unit.display_label, 'compliance_operating_units', unit.is_active
FROM compliance_operating_units AS unit
WHERE NOT EXISTS (
  SELECT 1
  FROM compliance_organization_registry AS reg
  WHERE reg.organization_scope = unit.scope
    AND reg.organization_id = unit.id
);

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

CREATE OR REPLACE FUNCTION validate_compliance_operation_scope_reference()
RETURNS trigger AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id is required for % scope', NEW.organization_scope;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM compliance_organization_registry AS reg
    WHERE reg.organization_scope = NEW.organization_scope
      AND reg.organization_id = NEW.organization_id
      AND reg.is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Unknown or inactive % organization_id: %', NEW.organization_scope, NEW.organization_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

UPDATE compliance_operation_runs AS run
SET organization_id = unit.id
FROM compliance_operating_units AS unit
WHERE run.organization_scope = unit.scope
  AND run.organization_scope IN ('admin', 'shared')
  AND run.organization_id IS NULL
  AND unit.unit_code = CASE run.organization_scope
    WHEN 'admin' THEN 'admin_default'
    WHEN 'shared' THEN 'shared_default'
    ELSE unit.unit_code
  END;

ALTER TABLE compliance_operation_runs
  ADD CONSTRAINT compliance_operation_runs_scope_id_rule_check
  CHECK (organization_id IS NOT NULL);

CREATE OR REPLACE FUNCTION sync_compliance_org_registry_from_operating_units()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE compliance_organization_registry
    SET is_active = FALSE,
        updated_at = NOW()
    WHERE organization_scope = OLD.scope
      AND organization_id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO compliance_organization_registry (organization_scope, organization_id, display_label, source_table, is_active, updated_at)
  VALUES (NEW.scope, NEW.id, NEW.display_label, 'compliance_operating_units', NEW.is_active, NOW())
  ON CONFLICT (organization_scope, organization_id)
    WHERE organization_id IS NOT NULL
  DO UPDATE SET
    display_label = EXCLUDED.display_label,
    source_table = EXCLUDED.source_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_compliance_org_registry_operating_units'
  ) THEN
    CREATE TRIGGER trg_sync_compliance_org_registry_operating_units
    AFTER INSERT OR UPDATE OF display_label, is_active OR DELETE ON compliance_operating_units
    FOR EACH ROW
    EXECUTE FUNCTION sync_compliance_org_registry_from_operating_units();
  END IF;
END $$;
