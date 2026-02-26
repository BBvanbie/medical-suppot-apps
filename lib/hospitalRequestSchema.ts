import { db } from "@/lib/db";

let ensured = false;

export async function ensureHospitalRequestTables(): Promise<void> {
  if (ensured) return;

  await db.query(`
    CREATE TABLE IF NOT EXISTS hospital_requests (
      id BIGSERIAL PRIMARY KEY,
      request_id TEXT NOT NULL UNIQUE,
      case_id TEXT NOT NULL,
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
      acted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS hospital_patients (
      id BIGSERIAL PRIMARY KEY,
      target_id BIGINT NOT NULL UNIQUE REFERENCES hospital_request_targets(id) ON DELETE CASCADE,
      hospital_id INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
      case_id TEXT NOT NULL,
      request_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'TRANSPORT_DECIDED',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_hospital_requests_case_id ON hospital_requests(case_id);
    CREATE INDEX IF NOT EXISTS idx_hospital_requests_sent_at ON hospital_requests(sent_at DESC);
    CREATE INDEX IF NOT EXISTS idx_hospital_request_targets_hospital_id ON hospital_request_targets(hospital_id);
    CREATE INDEX IF NOT EXISTS idx_hospital_request_targets_status ON hospital_request_targets(status);
    CREATE INDEX IF NOT EXISTS idx_hospital_request_targets_updated_at ON hospital_request_targets(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_hospital_request_events_target_id ON hospital_request_events(target_id);
    CREATE INDEX IF NOT EXISTS idx_hospital_request_events_acted_at ON hospital_request_events(acted_at DESC);

    ALTER TABLE hospital_requests
    ADD COLUMN IF NOT EXISTS patient_summary JSONB NOT NULL DEFAULT '{}'::jsonb;
  `);

  ensured = true;
}
