UPDATE hospital_request_targets
SET accepted_capacity = NULL
WHERE accepted_capacity IS NOT NULL
  AND accepted_capacity < 1;

ALTER TABLE hospital_request_targets
  DROP CONSTRAINT IF EXISTS hospital_request_targets_accepted_capacity_check;

ALTER TABLE hospital_request_targets
  ADD CONSTRAINT hospital_request_targets_accepted_capacity_check
  CHECK (accepted_capacity IS NULL OR accepted_capacity >= 1);
