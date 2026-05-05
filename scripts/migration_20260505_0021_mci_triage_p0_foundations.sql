CREATE TABLE IF NOT EXISTS triage_algorithm_versions (
  id BIGSERIAL PRIMARY KEY,
  method TEXT NOT NULL CHECK (method IN ('START', 'PAT')),
  version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'APPROVED', 'RETIRED')),
  rules_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  approved_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  retired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (method, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_triage_algorithm_versions_one_approved
  ON triage_algorithm_versions(method)
  WHERE status = 'APPROVED';

INSERT INTO triage_algorithm_versions (method, version, status, rules_summary, approved_at, updated_at)
VALUES
  ('START', 'START-P0-2026-05-05', 'APPROVED', '{"source":"P0 default START"}'::jsonb, NOW(), NOW()),
  ('PAT', 'PAT-P0-2026-05-05', 'APPROVED', '{"source":"P0 default PAT/anatomical assessment"}'::jsonb, NOW(), NOW())
ON CONFLICT (method, version) DO NOTHING;

ALTER TABLE triage_incidents
  ADD COLUMN IF NOT EXISTS closure_type TEXT CHECK (closure_type IN ('NORMAL', 'FORCED')),
  ADD COLUMN IF NOT EXISTS closure_reason TEXT,
  ADD COLUMN IF NOT EXISTS closed_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS closure_review JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE triage_incident_teams
  ADD COLUMN IF NOT EXISTS command_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS command_request_note TEXT;

ALTER TABLE triage_patients
  DROP CONSTRAINT IF EXISTS triage_patients_incident_id_patient_no_key;

ALTER TABLE triage_patients
  ALTER COLUMN patient_no DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS provisional_patient_no TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by_team_id INTEGER REFERENCES emergency_teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_reason TEXT,
  ADD COLUMN IF NOT EXISTS merged_into_patient_id BIGINT REFERENCES triage_patients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS start_algorithm_version_id BIGINT REFERENCES triage_algorithm_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pat_algorithm_version_id BIGINT REFERENCES triage_algorithm_versions(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_triage_patients_incident_patient_no_confirmed
  ON triage_patients(incident_id, patient_no)
  WHERE patient_no IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_triage_patients_incident_provisional_no
  ON triage_patients(incident_id, provisional_patient_no)
  WHERE provisional_patient_no IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_triage_patients_review_queue
  ON triage_patients(incident_id, registration_status, created_at ASC)
  WHERE registration_status = 'PENDING_COMMAND_REVIEW';

UPDATE triage_patients p
SET start_algorithm_version_id = COALESCE(
      p.start_algorithm_version_id,
      (SELECT id FROM triage_algorithm_versions WHERE method = 'START' AND status = 'APPROVED' ORDER BY approved_at DESC NULLS LAST, id DESC LIMIT 1)
    ),
    pat_algorithm_version_id = COALESCE(
      p.pat_algorithm_version_id,
      (SELECT id FROM triage_algorithm_versions WHERE method = 'PAT' AND status = 'APPROVED' ORDER BY approved_at DESC NULLS LAST, id DESC LIMIT 1)
    )
WHERE p.registration_status = 'CONFIRMED';

CREATE TABLE IF NOT EXISTS triage_patient_tag_events (
  id BIGSERIAL PRIMARY KEY,
  incident_id BIGINT NOT NULL REFERENCES triage_incidents(id) ON DELETE CASCADE,
  patient_id BIGINT NOT NULL REFERENCES triage_patients(id) ON DELETE CASCADE,
  from_tag TEXT CHECK (from_tag IN ('RED', 'YELLOW', 'GREEN', 'BLACK')),
  to_tag TEXT NOT NULL CHECK (to_tag IN ('RED', 'YELLOW', 'GREEN', 'BLACK')),
  reason TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL CHECK (source IN ('START', 'PAT', 'MANUAL_OVERRIDE', 'REVIEW')),
  start_algorithm_version_id BIGINT REFERENCES triage_algorithm_versions(id) ON DELETE SET NULL,
  pat_algorithm_version_id BIGINT REFERENCES triage_algorithm_versions(id) ON DELETE SET NULL,
  acted_by_team_id INTEGER REFERENCES emergency_teams(id) ON DELETE SET NULL,
  acted_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  acted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_triage_patient_tag_events_patient
  ON triage_patient_tag_events(patient_id, acted_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_triage_patient_tag_events_incident
  ON triage_patient_tag_events(incident_id, acted_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS triage_incident_command_transitions (
  id BIGSERIAL PRIMARY KEY,
  incident_id BIGINT NOT NULL REFERENCES triage_incidents(id) ON DELETE CASCADE,
  from_team_id INTEGER REFERENCES emergency_teams(id) ON DELETE SET NULL,
  to_team_id INTEGER NOT NULL REFERENCES emergency_teams(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL DEFAULT '',
  requested_by_team_id INTEGER REFERENCES emergency_teams(id) ON DELETE SET NULL,
  approved_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  transitioned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_triage_incident_command_transitions_incident
  ON triage_incident_command_transitions(incident_id, transitioned_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS triage_audit_events (
  id BIGSERIAL PRIMARY KEY,
  incident_id BIGINT REFERENCES triage_incidents(id) ON DELETE SET NULL,
  incident_code TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('LIVE', 'TRAINING')),
  event_type TEXT NOT NULL,
  actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  actor_team_id INTEGER REFERENCES emergency_teams(id) ON DELETE SET NULL,
  actor_hospital_id INTEGER REFERENCES hospitals(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_triage_audit_events_incident
  ON triage_audit_events(incident_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_triage_audit_events_type
  ON triage_audit_events(event_type, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS triage_incident_reports (
  id BIGSERIAL PRIMARY KEY,
  incident_id BIGINT NOT NULL UNIQUE REFERENCES triage_incidents(id) ON DELETE CASCADE,
  report_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE triage_hospital_offers
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

UPDATE triage_hospital_offers
SET expires_at = COALESCE(expires_at, responded_at + INTERVAL '15 minutes');

ALTER TABLE triage_hospital_offers
  ALTER COLUMN expires_at SET NOT NULL;

ALTER TABLE triage_transport_assignments
  DROP CONSTRAINT IF EXISTS triage_transport_assignments_status_check;

ALTER TABLE triage_transport_assignments
  ADD CONSTRAINT triage_transport_assignments_status_check
  CHECK (status IN ('DRAFT', 'SENT_TO_TEAM', 'TRANSPORT_DECIDED', 'TRANSPORT_DECLINED', 'DEPARTED', 'ARRIVED', 'HANDOFF_COMPLETED'));

ALTER TABLE triage_transport_assignments
  ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS decline_reason TEXT,
  ADD COLUMN IF NOT EXISTS departed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS handoff_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS handoff_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_triage_transport_assignments_offer_status
  ON triage_transport_assignments(hospital_offer_id, status, updated_at DESC)
  WHERE hospital_offer_id IS NOT NULL;
