CREATE TABLE IF NOT EXISTS compliance_organization_registry (
  id BIGSERIAL PRIMARY KEY,
  organization_scope TEXT NOT NULL,
  organization_id BIGINT,
  display_label TEXT NOT NULL,
  source_table TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'compliance_organization_registry_scope_check'
  ) THEN
    ALTER TABLE compliance_organization_registry
      ADD CONSTRAINT compliance_organization_registry_scope_check
      CHECK (organization_scope IN ('hospital', 'ems', 'admin', 'shared'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'compliance_organization_registry_scope_id_check'
  ) THEN
    ALTER TABLE compliance_organization_registry
      ADD CONSTRAINT compliance_organization_registry_scope_id_check
      CHECK (
        (organization_scope IN ('hospital', 'ems') AND organization_id IS NOT NULL)
        OR (organization_scope IN ('admin', 'shared') AND organization_id IS NULL)
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_compliance_org_registry_scope_org_id_unique
  ON compliance_organization_registry(organization_scope, organization_id)
  WHERE organization_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_compliance_org_registry_scope_null_unique
  ON compliance_organization_registry(organization_scope)
  WHERE organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_compliance_org_registry_scope_active
  ON compliance_organization_registry(organization_scope, is_active, display_label, id DESC);

INSERT INTO compliance_organization_registry (organization_scope, organization_id, display_label, source_table, is_active)
SELECT 'admin', NULL, '運用管理共通', NULL, TRUE
WHERE NOT EXISTS (
  SELECT 1
  FROM compliance_organization_registry
  WHERE organization_scope = 'admin'
    AND organization_id IS NULL
);

INSERT INTO compliance_organization_registry (organization_scope, organization_id, display_label, source_table, is_active)
SELECT 'shared', NULL, '全体共通', NULL, TRUE
WHERE NOT EXISTS (
  SELECT 1
  FROM compliance_organization_registry
  WHERE organization_scope = 'shared'
    AND organization_id IS NULL
);

INSERT INTO compliance_organization_registry (organization_scope, organization_id, display_label, source_table, is_active)
SELECT 'hospital', h.id, h.name, 'hospitals', TRUE
FROM hospitals AS h
WHERE NOT EXISTS (
  SELECT 1
  FROM compliance_organization_registry AS reg
  WHERE reg.organization_scope = 'hospital'
    AND reg.organization_id = h.id
);

UPDATE compliance_organization_registry AS reg
SET
  display_label = h.name,
  source_table = 'hospitals',
  is_active = TRUE,
  updated_at = NOW()
FROM hospitals AS h
WHERE reg.organization_scope = 'hospital'
  AND reg.organization_id = h.id;

INSERT INTO compliance_organization_registry (organization_scope, organization_id, display_label, source_table, is_active)
SELECT 'ems', team.id, team.team_name, 'emergency_teams', TRUE
FROM emergency_teams AS team
WHERE NOT EXISTS (
  SELECT 1
  FROM compliance_organization_registry AS reg
  WHERE reg.organization_scope = 'ems'
    AND reg.organization_id = team.id
);

UPDATE compliance_organization_registry AS reg
SET
  display_label = team.team_name,
  source_table = 'emergency_teams',
  is_active = TRUE,
  updated_at = NOW()
FROM emergency_teams AS team
WHERE reg.organization_scope = 'ems'
  AND reg.organization_id = team.id;

CREATE OR REPLACE FUNCTION sync_compliance_org_registry_from_hospitals()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE compliance_organization_registry
    SET is_active = FALSE,
        updated_at = NOW()
    WHERE organization_scope = 'hospital'
      AND organization_id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO compliance_organization_registry (organization_scope, organization_id, display_label, source_table, is_active, updated_at)
  VALUES ('hospital', NEW.id, NEW.name, 'hospitals', TRUE, NOW())
  ON CONFLICT (organization_scope, organization_id)
    WHERE organization_id IS NOT NULL
  DO UPDATE SET
    display_label = EXCLUDED.display_label,
    source_table = EXCLUDED.source_table,
    is_active = TRUE,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_compliance_org_registry_from_emergency_teams()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE compliance_organization_registry
    SET is_active = FALSE,
        updated_at = NOW()
    WHERE organization_scope = 'ems'
      AND organization_id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO compliance_organization_registry (organization_scope, organization_id, display_label, source_table, is_active, updated_at)
  VALUES ('ems', NEW.id, NEW.team_name, 'emergency_teams', TRUE, NOW())
  ON CONFLICT (organization_scope, organization_id)
    WHERE organization_id IS NOT NULL
  DO UPDATE SET
    display_label = EXCLUDED.display_label,
    source_table = EXCLUDED.source_table,
    is_active = TRUE,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_compliance_org_registry_hospitals'
  ) THEN
    CREATE TRIGGER trg_sync_compliance_org_registry_hospitals
    AFTER INSERT OR UPDATE OF name OR DELETE ON hospitals
    FOR EACH ROW
    EXECUTE FUNCTION sync_compliance_org_registry_from_hospitals();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_compliance_org_registry_emergency_teams'
  ) THEN
    CREATE TRIGGER trg_sync_compliance_org_registry_emergency_teams
    AFTER INSERT OR UPDATE OF team_name OR DELETE ON emergency_teams
    FOR EACH ROW
    EXECUTE FUNCTION sync_compliance_org_registry_from_emergency_teams();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION validate_compliance_operation_scope_reference()
RETURNS trigger AS $$
BEGIN
  IF NEW.organization_scope = 'hospital' THEN
    IF NEW.organization_id IS NULL OR NOT EXISTS (
      SELECT 1
      FROM compliance_organization_registry AS reg
      WHERE reg.organization_scope = 'hospital'
        AND reg.organization_id = NEW.organization_id
        AND reg.is_active = TRUE
    ) THEN
      RAISE EXCEPTION 'Unknown or inactive hospital organization_id: %', NEW.organization_id;
    END IF;
  ELSIF NEW.organization_scope = 'ems' THEN
    IF NEW.organization_id IS NULL OR NOT EXISTS (
      SELECT 1
      FROM compliance_organization_registry AS reg
      WHERE reg.organization_scope = 'ems'
        AND reg.organization_id = NEW.organization_id
        AND reg.is_active = TRUE
    ) THEN
      RAISE EXCEPTION 'Unknown or inactive ems organization_id: %', NEW.organization_id;
    END IF;
  ELSIF NEW.organization_scope IN ('admin', 'shared') THEN
    IF NEW.organization_id IS NOT NULL THEN
      RAISE EXCEPTION 'organization_id must be NULL for % scope', NEW.organization_scope;
    END IF;
  ELSE
    RAISE EXCEPTION 'Unknown organization scope: %', NEW.organization_scope;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_validate_compliance_operation_scope_reference'
  ) THEN
    CREATE TRIGGER trg_validate_compliance_operation_scope_reference
    BEFORE INSERT OR UPDATE OF organization_scope, organization_id ON compliance_operation_runs
    FOR EACH ROW
    EXECUTE FUNCTION validate_compliance_operation_scope_reference();
  END IF;
END $$;
