ALTER TABLE ems_user_settings
  ADD COLUMN IF NOT EXISTS operational_mode TEXT NOT NULL DEFAULT 'STANDARD';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ems_user_settings_operational_mode_check'
      AND conrelid = 'ems_user_settings'::regclass
  ) THEN
    ALTER TABLE ems_user_settings
      ADD CONSTRAINT ems_user_settings_operational_mode_check
      CHECK (operational_mode IN ('STANDARD', 'TRIAGE'));
  END IF;
END
$$;
