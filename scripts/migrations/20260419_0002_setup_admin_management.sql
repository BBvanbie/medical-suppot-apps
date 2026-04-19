CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL,
  actor_team_id BIGINT REFERENCES emergency_teams(id) ON DELETE SET NULL,
  actor_hospital_id BIGINT REFERENCES hospitals(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  before_json JSONB,
  after_json JSONB,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS actor_team_id BIGINT REFERENCES emergency_teams(id) ON DELETE SET NULL;

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS actor_hospital_id BIGINT REFERENCES hospitals(id) ON DELETE SET NULL;

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS metadata_json JSONB;

CREATE INDEX IF NOT EXISTS idx_audit_logs_target
  ON audit_logs(target_type, target_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor
  ON audit_logs(actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON audit_logs(action, created_at DESC);

ALTER TABLE hospitals
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE hospitals
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE emergency_teams
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE emergency_teams
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE emergency_teams
  ADD COLUMN IF NOT EXISTS case_number_code TEXT;

UPDATE emergency_teams
SET case_number_code = reassigned.code
FROM (
  WITH normalized_codes AS (
    SELECT
      id,
      CASE
        WHEN case_number_code ~ '^[0-9]{3}$' THEN case_number_code
        ELSE NULL
      END AS normalized_code
    FROM emergency_teams
  ),
  ranked_codes AS (
    SELECT
      id,
      normalized_code,
      ROW_NUMBER() OVER (PARTITION BY normalized_code ORDER BY id) AS code_rank
    FROM normalized_codes
  ),
  teams_needing_codes AS (
    SELECT
      id,
      ROW_NUMBER() OVER (ORDER BY id) AS assignment_rank
    FROM ranked_codes
    WHERE normalized_code IS NULL OR code_rank > 1
  ),
  available_codes AS (
    SELECT
      LPAD(series.code::text, 3, '0') AS code,
      ROW_NUMBER() OVER (ORDER BY series.code) AS assignment_rank
    FROM generate_series(1, 999) AS series(code)
    WHERE NOT EXISTS (
      SELECT 1
      FROM ranked_codes existing
      WHERE existing.normalized_code = LPAD(series.code::text, 3, '0')
        AND existing.code_rank = 1
    )
  )
  SELECT teams_needing_codes.id, available_codes.code
  FROM teams_needing_codes
  JOIN available_codes USING (assignment_rank)
) AS reassigned
WHERE emergency_teams.id = reassigned.id;

ALTER TABLE emergency_teams
  ALTER COLUMN case_number_code SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'emergency_teams_case_number_code_check'
      AND conrelid = 'emergency_teams'::regclass
  ) THEN
    ALTER TABLE emergency_teams DROP CONSTRAINT emergency_teams_case_number_code_check;
  END IF;
END
$$;

ALTER TABLE emergency_teams
  ADD CONSTRAINT emergency_teams_case_number_code_check
  CHECK (case_number_code ~ '^[0-9]{3}$');

CREATE UNIQUE INDEX IF NOT EXISTS idx_emergency_teams_case_number_code_unique
  ON emergency_teams(case_number_code);

CREATE TABLE IF NOT EXISTS devices (
  id BIGSERIAL PRIMARY KEY,
  device_code TEXT NOT NULL UNIQUE,
  device_name TEXT NOT NULL,
  role_scope TEXT NOT NULL CHECK (role_scope IN ('EMS', 'HOSPITAL')),
  team_id BIGINT REFERENCES emergency_teams(id) ON DELETE SET NULL,
  hospital_id BIGINT REFERENCES hospitals(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_lost BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devices_role_scope
  ON devices(role_scope, created_at DESC);
