ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS case_payload JSONB,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS case_uid TEXT,
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'LIVE',
  ADD COLUMN IF NOT EXISTS dispatch_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_from TEXT,
  ADD COLUMN IF NOT EXISTS created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS case_status TEXT NOT NULL DEFAULT 'NEW';

ALTER TABLE emergency_teams
  ADD COLUMN IF NOT EXISTS case_number_code TEXT;

UPDATE cases AS c
SET division = et.division
FROM emergency_teams AS et
WHERE c.team_id = et.id
  AND c.division IS DISTINCT FROM et.division;

UPDATE cases
SET division = CASE division
  WHEN '1部' THEN '1方面'
  WHEN '2部' THEN '2方面'
  WHEN '3部' THEN '3方面'
  ELSE division
END
WHERE division IN ('1部', '2部', '3部');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cases_mode_check'
      AND conrelid = 'cases'::regclass
  ) THEN
    ALTER TABLE cases DROP CONSTRAINT cases_mode_check;
  END IF;
END
$$;

ALTER TABLE cases
  ADD CONSTRAINT cases_mode_check
  CHECK (mode IN ('LIVE', 'TRAINING'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cases_division_check'
      AND conrelid = 'cases'::regclass
  ) THEN
    ALTER TABLE cases DROP CONSTRAINT cases_division_check;
  END IF;
END
$$;

ALTER TABLE cases
  ADD CONSTRAINT cases_division_check
  CHECK (division IN ('本部機動', '1方面', '2方面', '3方面', '4方面', '5方面', '6方面', '7方面', '8方面', '9方面', '10方面'));

UPDATE cases
SET case_uid = 'case-' || LPAD(id::text, 10, '0')
WHERE case_uid IS NULL;

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

ALTER TABLE cases
  ALTER COLUMN case_uid SET NOT NULL;

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

CREATE UNIQUE INDEX IF NOT EXISTS idx_cases_case_uid_unique
  ON cases(case_uid);

CREATE UNIQUE INDEX IF NOT EXISTS idx_emergency_teams_case_number_code_unique
  ON emergency_teams(case_number_code);

CREATE INDEX IF NOT EXISTS idx_cases_case_id
  ON cases(case_id);

CREATE INDEX IF NOT EXISTS idx_cases_mode_updated
  ON cases("mode", updated_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_cases_mode_team_timeline
  ON cases("mode", team_id, aware_date DESC, aware_time DESC, updated_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_cases_mode_division
  ON cases("mode", division);

CREATE INDEX IF NOT EXISTS idx_cases_created_from_created_at
  ON cases(created_from, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_cases_dispatch_at
  ON cases(dispatch_at DESC, id DESC);
