CREATE TABLE IF NOT EXISTS hospital_requests (
  id BIGSERIAL PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  case_id TEXT NOT NULL,
  case_uid TEXT NOT NULL REFERENCES cases(case_uid),
  mode TEXT NOT NULL DEFAULT 'LIVE' CHECK (mode IN ('LIVE', 'TRAINING')),
  patient_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  from_team_id INTEGER REFERENCES emergency_teams(id) ON DELETE SET NULL,
  created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  first_sent_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hospital_request_targets (
  id BIGSERIAL PRIMARY KEY,
  hospital_request_id BIGINT NOT NULL REFERENCES hospital_requests(id) ON DELETE CASCADE,
  hospital_id INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (
    status IN (
      'UNREAD',
      'READ',
      'NEGOTIATING',
      'ACCEPTABLE',
      'NOT_ACCEPTABLE',
      'TRANSPORT_DECIDED',
      'TRANSPORT_DECLINED'
    )
  ),
  selected_departments JSONB NOT NULL DEFAULT '[]'::jsonb,
  opened_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  updated_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  distance_km DOUBLE PRECISION,
  UNIQUE (hospital_request_id, hospital_id)
);

CREATE TABLE IF NOT EXISTS hospital_request_events (
  id BIGSERIAL PRIMARY KEY,
  target_id BIGINT NOT NULL REFERENCES hospital_request_targets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  acted_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  note TEXT,
  acted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason_code TEXT,
  reason_text TEXT
);

CREATE TABLE IF NOT EXISTS hospital_patients (
  id BIGSERIAL PRIMARY KEY,
  target_id BIGINT NOT NULL UNIQUE REFERENCES hospital_request_targets(id) ON DELETE CASCADE,
  hospital_id INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  case_id TEXT NOT NULL,
  case_uid TEXT NOT NULL REFERENCES cases(case_uid),
  request_id TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'LIVE' CHECK (mode IN ('LIVE', 'TRAINING')),
  status TEXT NOT NULL DEFAULT 'TRANSPORT_DECIDED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hospital_department_availability (
  hospital_id INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  department_id INTEGER NOT NULL REFERENCES medical_departments(id) ON DELETE CASCADE,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (hospital_id, department_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  audience_role TEXT NOT NULL CHECK (audience_role IN ('EMS', 'HOSPITAL')),
  mode TEXT NOT NULL DEFAULT 'LIVE' CHECK (mode IN ('LIVE', 'TRAINING')),
  team_id INTEGER REFERENCES emergency_teams(id) ON DELETE SET NULL,
  hospital_id INTEGER REFERENCES hospitals(id) ON DELETE SET NULL,
  target_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  case_id TEXT,
  case_uid TEXT REFERENCES cases(case_uid),
  target_id BIGINT REFERENCES hospital_request_targets(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  menu_key TEXT,
  tab_key TEXT,
  severity TEXT NOT NULL DEFAULT 'info',
  dedupe_key TEXT,
  expires_at TIMESTAMPTZ,
  acked_at TIMESTAMPTZ,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'LIVE';

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS severity TEXT NOT NULL DEFAULT 'info';

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS acked_at TIMESTAMPTZ;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notifications_team_id_fkey'
      AND conrelid = 'notifications'::regclass
  ) THEN
    ALTER TABLE notifications DROP CONSTRAINT notifications_team_id_fkey;
  END IF;
  ALTER TABLE notifications
    ADD CONSTRAINT notifications_team_id_fkey
    FOREIGN KEY (team_id) REFERENCES emergency_teams(id) ON DELETE SET NULL;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notifications_hospital_id_fkey'
      AND conrelid = 'notifications'::regclass
  ) THEN
    ALTER TABLE notifications DROP CONSTRAINT notifications_hospital_id_fkey;
  END IF;
  ALTER TABLE notifications
    ADD CONSTRAINT notifications_hospital_id_fkey
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notifications_target_id_fkey'
      AND conrelid = 'notifications'::regclass
  ) THEN
    ALTER TABLE notifications DROP CONSTRAINT notifications_target_id_fkey;
  END IF;
  ALTER TABLE notifications
    ADD CONSTRAINT notifications_target_id_fkey
    FOREIGN KEY (target_id) REFERENCES hospital_request_targets(id) ON DELETE SET NULL;
END
$$;

ALTER TABLE hospital_requests
  ADD COLUMN IF NOT EXISTS patient_summary JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE hospital_requests
  ADD COLUMN IF NOT EXISTS case_uid TEXT;

ALTER TABLE hospital_requests
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'LIVE';

ALTER TABLE hospital_requests
  ADD COLUMN IF NOT EXISTS first_sent_at TIMESTAMPTZ;

ALTER TABLE hospital_request_targets
  ADD COLUMN IF NOT EXISTS distance_km DOUBLE PRECISION;

ALTER TABLE hospital_request_events
  ADD COLUMN IF NOT EXISTS reason_code TEXT;

ALTER TABLE hospital_request_events
  ADD COLUMN IF NOT EXISTS reason_text TEXT;

ALTER TABLE hospital_patients
  ADD COLUMN IF NOT EXISTS case_uid TEXT;

ALTER TABLE hospital_patients
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'LIVE';

ALTER TABLE emergency_teams
  ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE INDEX IF NOT EXISTS idx_hospital_requests_case_id ON hospital_requests(case_id);
CREATE INDEX IF NOT EXISTS idx_hospital_requests_case_uid ON hospital_requests(case_uid);
CREATE INDEX IF NOT EXISTS idx_hospital_requests_first_sent_at ON hospital_requests(first_sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_hospital_requests_sent_at ON hospital_requests(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_hospital_requests_case_uid_sent_at
  ON hospital_requests(case_uid, sent_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_hospital_requests_mode_sent_at
  ON hospital_requests("mode", sent_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_hospital_requests_created_by_created
  ON hospital_requests(created_by_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hospital_request_targets_hospital_id ON hospital_request_targets(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hospital_request_targets_status ON hospital_request_targets(status);
CREATE INDEX IF NOT EXISTS idx_hospital_request_targets_updated_at ON hospital_request_targets(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_hospital_request_targets_hospital_updated
  ON hospital_request_targets(hospital_id, updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_hospital_request_targets_hospital_status_updated
  ON hospital_request_targets(hospital_id, status, updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_hospital_request_targets_request_status_updated
  ON hospital_request_targets(hospital_request_id, status, updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_hospital_request_events_target_id ON hospital_request_events(target_id);
CREATE INDEX IF NOT EXISTS idx_hospital_request_events_acted_at ON hospital_request_events(acted_at DESC);
CREATE INDEX IF NOT EXISTS idx_hospital_request_events_target_type_status_acted
  ON hospital_request_events(target_id, event_type, to_status, acted_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_hospital_request_events_actor_acted
  ON hospital_request_events(acted_by_user_id, acted_at DESC);
CREATE INDEX IF NOT EXISTS idx_hospital_department_availability_hospital_available
  ON hospital_department_availability(hospital_id, is_available, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_role_scope_unread_created
  ON notifications(audience_role, team_id, hospital_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_role_mode_scope_unread_created
  ON notifications(audience_role, "mode", team_id, hospital_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_target_user_unread_created
  ON notifications(target_user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_target_user_mode_unread_created
  ON notifications(target_user_id, "mode", is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_case_target ON notifications(case_id, target_id);
CREATE INDEX IF NOT EXISTS idx_notifications_case_uid_target ON notifications(case_uid, target_id);
CREATE INDEX IF NOT EXISTS idx_notifications_dedupe_key ON notifications(dedupe_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_ems_team_unread_created
  ON notifications("mode", team_id, created_at DESC, id DESC)
  WHERE audience_role = 'EMS'
    AND target_user_id IS NULL
    AND is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_hospital_unread_created
  ON notifications("mode", hospital_id, created_at DESC, id DESC)
  WHERE audience_role = 'HOSPITAL'
    AND target_user_id IS NULL
    AND is_read = FALSE;
WITH notification_dedupe_ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY audience_role, COALESCE(team_id, -1), COALESCE(hospital_id, -1), COALESCE(target_user_id, -1), dedupe_key
      ORDER BY created_at DESC, id DESC
    ) AS row_num
  FROM notifications
  WHERE dedupe_key IS NOT NULL
)
DELETE FROM notifications n
USING notification_dedupe_ranked ranked
WHERE n.id = ranked.id
  AND ranked.row_num > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_scope_dedupe_unique ON notifications(audience_role, COALESCE(team_id, -1), COALESCE(hospital_id, -1), COALESCE(target_user_id, -1), dedupe_key) WHERE dedupe_key IS NOT NULL;

ALTER TABLE hospital_patients
  ADD COLUMN IF NOT EXISTS case_uid TEXT;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS case_uid TEXT REFERENCES cases(case_uid);

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS severity TEXT NOT NULL DEFAULT 'info';

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS acked_at TIMESTAMPTZ;

UPDATE hospital_requests r
SET case_uid = c.case_uid
FROM cases c
WHERE r.case_uid IS NULL
  AND r.case_id = c.case_id;

UPDATE hospital_requests r
SET mode = c.mode
FROM cases c
WHERE r.case_uid = c.case_uid
  AND r.mode IS DISTINCT FROM c.mode;

UPDATE hospital_patients p
SET case_uid = c.case_uid
FROM cases c
WHERE p.case_uid IS NULL
  AND p.case_id = c.case_id;

UPDATE hospital_patients p
SET mode = c.mode
FROM cases c
WHERE p.case_uid = c.case_uid
  AND p.mode IS DISTINCT FROM c.mode;

UPDATE notifications n
SET case_uid = c.case_uid
FROM cases c
WHERE n.case_uid IS NULL
  AND n.case_id = c.case_id;

UPDATE notifications n
SET mode = c.mode
FROM cases c
WHERE n.case_uid = c.case_uid
  AND n.mode IS DISTINCT FROM c.mode;

UPDATE hospital_requests
SET first_sent_at = sent_at
WHERE first_sent_at IS NULL;

ALTER TABLE hospital_requests
  ALTER COLUMN first_sent_at SET NOT NULL;

ALTER TABLE hospital_requests
  ALTER COLUMN case_uid SET NOT NULL;

ALTER TABLE hospital_patients
  ALTER COLUMN case_uid SET NOT NULL;

DELETE FROM hospital_patients hp
USING hospital_patients duplicate_hp
WHERE hp.case_uid = duplicate_hp.case_uid
  AND hp.id < duplicate_hp.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_hospital_patients_case_uid_unique ON hospital_patients(case_uid);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'notifications_case_identity_check'
      AND conrelid = 'notifications'::regclass
  ) THEN
    ALTER TABLE notifications
      ADD CONSTRAINT notifications_case_identity_check
      CHECK (
        (case_id IS NULL AND case_uid IS NULL)
        OR (case_id IS NOT NULL AND case_uid IS NOT NULL)
      );
  END IF;
END
$$;
