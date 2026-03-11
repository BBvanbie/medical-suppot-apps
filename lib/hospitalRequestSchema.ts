import { db } from "@/lib/db";

let ensured = false;
let attempted = false;

export async function ensureHospitalRequestTables(): Promise<void> {
  if (ensured || attempted) return;
  attempted = true;

  try {
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
      team_id INTEGER REFERENCES emergency_teams(id) ON DELETE CASCADE,
      hospital_id INTEGER REFERENCES hospitals(id) ON DELETE CASCADE,
      target_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      kind TEXT NOT NULL,
      case_id TEXT,
      target_id BIGINT REFERENCES hospital_request_targets(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      menu_key TEXT,
      tab_key TEXT,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      read_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_hospital_requests_case_id ON hospital_requests(case_id);
    CREATE INDEX IF NOT EXISTS idx_hospital_requests_sent_at ON hospital_requests(sent_at DESC);
    CREATE INDEX IF NOT EXISTS idx_hospital_request_targets_hospital_id ON hospital_request_targets(hospital_id);
    CREATE INDEX IF NOT EXISTS idx_hospital_request_targets_status ON hospital_request_targets(status);
    CREATE INDEX IF NOT EXISTS idx_hospital_request_targets_updated_at ON hospital_request_targets(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_hospital_request_events_target_id ON hospital_request_events(target_id);
    CREATE INDEX IF NOT EXISTS idx_hospital_request_events_acted_at ON hospital_request_events(acted_at DESC);
    CREATE INDEX IF NOT EXISTS idx_hospital_department_availability_hospital_available
      ON hospital_department_availability(hospital_id, is_available, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notifications_role_scope_unread_created
      ON notifications(audience_role, team_id, hospital_id, is_read, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notifications_target_user_unread_created
      ON notifications(target_user_id, is_read, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notifications_case_target
      ON notifications(case_id, target_id);

    ALTER TABLE hospital_requests
    ADD COLUMN IF NOT EXISTS patient_summary JSONB NOT NULL DEFAULT '{}'::jsonb;

    ALTER TABLE hospital_request_targets
    ADD COLUMN IF NOT EXISTS distance_km DOUBLE PRECISION;

    ALTER TABLE hospital_request_events
    ADD COLUMN IF NOT EXISTS reason_code TEXT;

    ALTER TABLE hospital_request_events
    ADD COLUMN IF NOT EXISTS reason_text TEXT;

      ALTER TABLE emergency_teams
      ADD COLUMN IF NOT EXISTS phone TEXT;
    `);

    ensured = true;
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code === "42501") {
      console.warn("ensureHospitalRequestTables skipped due to insufficient DB privilege (42501).");
      ensured = true;
      return;
    }
    attempted = false;
    throw error;
  }
}




