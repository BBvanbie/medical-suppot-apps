ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS case_payload JSONB,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS case_uid TEXT,
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'LIVE';

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

UPDATE cases
SET case_uid = 'case-' || LPAD(id::text, 10, '0')
WHERE case_uid IS NULL;

ALTER TABLE cases
  ALTER COLUMN case_uid SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cases_case_uid_unique
  ON cases(case_uid);

CREATE INDEX IF NOT EXISTS idx_cases_case_id
  ON cases(case_id);

CREATE INDEX IF NOT EXISTS idx_cases_mode_updated
  ON cases("mode", updated_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_cases_mode_team_timeline
  ON cases("mode", team_id, aware_date DESC, aware_time DESC, updated_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_cases_mode_division
  ON cases("mode", division);
