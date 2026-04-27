ALTER TABLE hospital_request_targets
  ADD COLUMN IF NOT EXISTS accepted_capacity INTEGER;

ALTER TABLE hospital_request_targets
  DROP CONSTRAINT IF EXISTS hospital_request_targets_accepted_capacity_check;

ALTER TABLE hospital_request_targets
  ADD CONSTRAINT hospital_request_targets_accepted_capacity_check
  CHECK (accepted_capacity IS NULL OR accepted_capacity >= 0);
