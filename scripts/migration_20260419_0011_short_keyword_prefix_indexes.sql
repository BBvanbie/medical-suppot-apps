CREATE INDEX IF NOT EXISTS idx_cases_mode_case_id_prefix
  ON cases (mode, lower(case_id) text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_cases_mode_patient_name_prefix
  ON cases (mode, lower(patient_name) text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_cases_mode_symptom_prefix
  ON cases (mode, lower(symptom) text_pattern_ops);
