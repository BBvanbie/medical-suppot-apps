CREATE TABLE IF NOT EXISTS hospital_requests (
  id BIGSERIAL PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  case_id TEXT NOT NULL,
  case_uid TEXT NOT NULL REFERENCES cases(case_uid),
  patient_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  from_team_id INTEGER REFERENCES emergency_teams(id) ON DELETE SET NULL,
  created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
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
  status TEXT NOT NULL DEFAULT 'TRANSPORT_DECIDED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hospital_requests_case_id ON hospital_requests(case_id);
CREATE INDEX IF NOT EXISTS idx_hospital_requests_case_uid ON hospital_requests(case_uid);
CREATE INDEX IF NOT EXISTS idx_hospital_requests_sent_at ON hospital_requests(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_hospital_request_targets_hospital_id ON hospital_request_targets(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hospital_request_targets_status ON hospital_request_targets(status);
CREATE INDEX IF NOT EXISTS idx_hospital_request_targets_updated_at ON hospital_request_targets(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_hospital_request_events_target_id ON hospital_request_events(target_id);
CREATE INDEX IF NOT EXISTS idx_hospital_request_events_acted_at ON hospital_request_events(acted_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_case_uid_target ON notifications(case_uid, target_id);
CREATE INDEX IF NOT EXISTS idx_notifications_dedupe_key ON notifications(dedupe_key, created_at DESC);
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

ALTER TABLE hospital_requests
  ADD COLUMN IF NOT EXISTS patient_summary JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE hospital_requests
  ADD COLUMN IF NOT EXISTS case_uid TEXT;

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

UPDATE hospital_patients p
SET case_uid = c.case_uid
FROM cases c
WHERE p.case_uid IS NULL
  AND p.case_id = c.case_id;

UPDATE notifications n
SET case_uid = c.case_uid
FROM cases c
WHERE n.case_uid IS NULL
  AND n.case_id = c.case_id;

ALTER TABLE hospital_requests
  ALTER COLUMN case_uid SET NOT NULL;

ALTER TABLE hospital_patients
  ALTER COLUMN case_uid SET NOT NULL;

DELETE FROM hospital_patients hp
USING hospital_patients duplicate_hp
WHERE hp.case_uid = duplicate_hp.case_uid
  AND hp.id < duplicate_hp.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_hospital_patients_case_uid_unique ON hospital_patients(case_uid);

DO $
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