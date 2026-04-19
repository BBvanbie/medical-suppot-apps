CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_cases_case_id_trgm
  ON cases
  USING GIN (case_id gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cases_patient_name_trgm
  ON cases
  USING GIN (patient_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cases_address_trgm
  ON cases
  USING GIN (address gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cases_symptom_trgm
  ON cases
  USING GIN (symptom gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_emergency_teams_team_name_trgm
  ON emergency_teams
  USING GIN (team_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_hospitals_name_trgm
  ON hospitals
  USING GIN (name gin_trgm_ops);
