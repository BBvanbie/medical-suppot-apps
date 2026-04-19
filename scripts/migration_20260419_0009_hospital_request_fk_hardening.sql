DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'hospital_request_targets_hospital_request_id_fkey'
      AND conrelid = 'hospital_request_targets'::regclass
  ) THEN
    ALTER TABLE hospital_request_targets
      DROP CONSTRAINT hospital_request_targets_hospital_request_id_fkey;
  END IF;

  ALTER TABLE hospital_request_targets
    ADD CONSTRAINT hospital_request_targets_hospital_request_id_fkey
    FOREIGN KEY (hospital_request_id) REFERENCES hospital_requests(id) ON DELETE RESTRICT;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'hospital_request_targets_hospital_id_fkey'
      AND conrelid = 'hospital_request_targets'::regclass
  ) THEN
    ALTER TABLE hospital_request_targets
      DROP CONSTRAINT hospital_request_targets_hospital_id_fkey;
  END IF;

  ALTER TABLE hospital_request_targets
    ADD CONSTRAINT hospital_request_targets_hospital_id_fkey
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'hospital_request_events_target_id_fkey'
      AND conrelid = 'hospital_request_events'::regclass
  ) THEN
    ALTER TABLE hospital_request_events
      DROP CONSTRAINT hospital_request_events_target_id_fkey;
  END IF;

  ALTER TABLE hospital_request_events
    ADD CONSTRAINT hospital_request_events_target_id_fkey
    FOREIGN KEY (target_id) REFERENCES hospital_request_targets(id) ON DELETE RESTRICT;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'hospital_patients_target_id_fkey'
      AND conrelid = 'hospital_patients'::regclass
  ) THEN
    ALTER TABLE hospital_patients
      DROP CONSTRAINT hospital_patients_target_id_fkey;
  END IF;

  ALTER TABLE hospital_patients
    ADD CONSTRAINT hospital_patients_target_id_fkey
    FOREIGN KEY (target_id) REFERENCES hospital_request_targets(id) ON DELETE RESTRICT;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'hospital_patients_hospital_id_fkey'
      AND conrelid = 'hospital_patients'::regclass
  ) THEN
    ALTER TABLE hospital_patients
      DROP CONSTRAINT hospital_patients_hospital_id_fkey;
  END IF;

  ALTER TABLE hospital_patients
    ADD CONSTRAINT hospital_patients_hospital_id_fkey
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT;
END
$$;
