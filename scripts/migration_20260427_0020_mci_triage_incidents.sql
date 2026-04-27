CREATE TABLE IF NOT EXISTS triage_incidents (
  id BIGSERIAL PRIMARY KEY,
  incident_code TEXT UNIQUE,
  source_case_uid TEXT NOT NULL REFERENCES cases(case_uid) ON DELETE RESTRICT,
  mode TEXT NOT NULL DEFAULT 'LIVE' CHECK (mode IN ('LIVE', 'TRAINING')),
  status TEXT NOT NULL CHECK (status IN ('PENDING_APPROVAL', 'ACTIVE', 'CLOSED')),
  address TEXT NOT NULL DEFAULT '',
  aware_date DATE,
  summary TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_by_team_id INTEGER REFERENCES emergency_teams(id) ON DELETE SET NULL,
  approved_by_dispatch_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  command_team_id INTEGER REFERENCES emergency_teams(id) ON DELETE SET NULL,
  start_red_count INTEGER NOT NULL DEFAULT 0 CHECK (start_red_count >= 0),
  start_yellow_count INTEGER NOT NULL DEFAULT 0 CHECK (start_yellow_count >= 0),
  start_green_count INTEGER NOT NULL DEFAULT 0 CHECK (start_green_count >= 0),
  start_black_count INTEGER NOT NULL DEFAULT 0 CHECK (start_black_count >= 0),
  pat_red_count INTEGER NOT NULL DEFAULT 0 CHECK (pat_red_count >= 0),
  pat_yellow_count INTEGER NOT NULL DEFAULT 0 CHECK (pat_yellow_count >= 0),
  pat_green_count INTEGER NOT NULL DEFAULT 0 CHECK (pat_green_count >= 0),
  pat_black_count INTEGER NOT NULL DEFAULT 0 CHECK (pat_black_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_triage_incidents_source_case_uid
  ON triage_incidents(source_case_uid);
CREATE INDEX IF NOT EXISTS idx_triage_incidents_mode_status_updated
  ON triage_incidents(mode, status, updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_triage_incidents_command_team
  ON triage_incidents(command_team_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS triage_incident_teams (
  id BIGSERIAL PRIMARY KEY,
  incident_id BIGINT NOT NULL REFERENCES triage_incidents(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES emergency_teams(id) ON DELETE RESTRICT,
  role TEXT NOT NULL CHECK (role IN ('CREATOR', 'COMMAND_CANDIDATE', 'COMMANDER', 'TRANSPORT')),
  participation_status TEXT NOT NULL CHECK (participation_status IN ('REQUESTED', 'JOINED', 'ARRIVED', 'AVAILABLE', 'ASSIGNED', 'LEFT')),
  operational_mode_at_request TEXT NOT NULL DEFAULT 'STANDARD' CHECK (operational_mode_at_request IN ('STANDARD', 'TRIAGE')),
  triage_mode_requested_at TIMESTAMPTZ,
  triage_mode_acknowledged_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (incident_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_triage_incident_teams_incident_role
  ON triage_incident_teams(incident_id, role, participation_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_triage_incident_teams_team_status
  ON triage_incident_teams(team_id, participation_status, updated_at DESC);

CREATE TABLE IF NOT EXISTS triage_patients (
  id BIGSERIAL PRIMARY KEY,
  incident_id BIGINT NOT NULL REFERENCES triage_incidents(id) ON DELETE CASCADE,
  patient_no TEXT NOT NULL,
  registration_status TEXT NOT NULL CHECK (registration_status IN ('DRAFT', 'PENDING_COMMAND_REVIEW', 'CONFIRMED', 'MERGED', 'CANCELLED')),
  current_tag TEXT NOT NULL CHECK (current_tag IN ('RED', 'YELLOW', 'GREEN', 'BLACK')),
  start_tag TEXT CHECK (start_tag IN ('RED', 'YELLOW', 'GREEN', 'BLACK')),
  pat_tag TEXT CHECK (pat_tag IN ('RED', 'YELLOW', 'GREEN', 'BLACK')),
  injury_details TEXT NOT NULL DEFAULT '',
  registered_by_team_id INTEGER REFERENCES emergency_teams(id) ON DELETE SET NULL,
  confirmed_by_team_id INTEGER REFERENCES emergency_teams(id) ON DELETE SET NULL,
  assigned_team_id INTEGER REFERENCES emergency_teams(id) ON DELETE SET NULL,
  assigned_hospital_id INTEGER REFERENCES hospitals(id) ON DELETE SET NULL,
  transport_assignment_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (incident_id, patient_no)
);

CREATE INDEX IF NOT EXISTS idx_triage_patients_incident_tag
  ON triage_patients(incident_id, current_tag, registration_status, patient_no);
CREATE INDEX IF NOT EXISTS idx_triage_patients_assignment
  ON triage_patients(transport_assignment_id);

CREATE TABLE IF NOT EXISTS triage_hospital_requests (
  id BIGSERIAL PRIMARY KEY,
  incident_id BIGINT NOT NULL REFERENCES triage_incidents(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL UNIQUE,
  hospital_id INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('UNREAD', 'READ', 'NEGOTIATING', 'ACCEPTABLE', 'NOT_ACCEPTABLE')),
  disaster_summary TEXT NOT NULL DEFAULT '',
  start_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  pat_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT NOT NULL DEFAULT '',
  created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (incident_id, hospital_id)
);

CREATE INDEX IF NOT EXISTS idx_triage_hospital_requests_incident_status
  ON triage_hospital_requests(incident_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_triage_hospital_requests_hospital_status
  ON triage_hospital_requests(hospital_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS triage_hospital_offers (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT NOT NULL UNIQUE REFERENCES triage_hospital_requests(id) ON DELETE CASCADE,
  hospital_id INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE RESTRICT,
  red_capacity INTEGER NOT NULL DEFAULT 0 CHECK (red_capacity >= 0),
  yellow_capacity INTEGER NOT NULL DEFAULT 0 CHECK (yellow_capacity >= 0),
  green_capacity INTEGER NOT NULL DEFAULT 0 CHECK (green_capacity >= 0),
  black_capacity INTEGER NOT NULL DEFAULT 0 CHECK (black_capacity >= 0),
  notes TEXT NOT NULL DEFAULT '',
  responded_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  responded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS triage_transport_assignments (
  id BIGSERIAL PRIMARY KEY,
  incident_id BIGINT NOT NULL REFERENCES triage_incidents(id) ON DELETE CASCADE,
  hospital_offer_id BIGINT REFERENCES triage_hospital_offers(id) ON DELETE SET NULL,
  hospital_id INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE RESTRICT,
  team_id INTEGER NOT NULL REFERENCES emergency_teams(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'SENT_TO_TEAM', 'TRANSPORT_DECIDED', 'TRANSPORT_DECLINED', 'ARRIVED')),
  assigned_by_team_id INTEGER REFERENCES emergency_teams(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_triage_transport_assignments_incident_status
  ON triage_transport_assignments(incident_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_triage_transport_assignments_team_status
  ON triage_transport_assignments(team_id, status, updated_at DESC);

ALTER TABLE triage_patients
  DROP CONSTRAINT IF EXISTS triage_patients_transport_assignment_id_fkey;

ALTER TABLE triage_patients
  ADD CONSTRAINT triage_patients_transport_assignment_id_fkey
  FOREIGN KEY (transport_assignment_id) REFERENCES triage_transport_assignments(id) ON DELETE SET NULL;
