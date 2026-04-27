import { loadEnvConfig } from "@next/env";
import { hash } from "bcryptjs";
import { Pool } from "pg";

const TEST_PASSWORD = "Passw0rd!";
const TEAM_A_CODE = "E2E-TEAM-A";
const TEAM_B_CODE = "E2E-TEAM-B";
const TEAM_A_NAME = "E2E 本部機動第1";
const TEAM_B_NAME = "E2E 本部機動第2";
const HOSPITAL_A_SOURCE_NO = 990001;
const HOSPITAL_B_SOURCE_NO = 990002;
const HOSPITAL_A_NAME = "E2E 中央病院";
const HOSPITAL_B_NAME = "E2E 西病院";
const EMS_A_USERNAME = "e2e_ems_a";
const EMS_B_USERNAME = "e2e_ems_b";
const DISPATCH_USERNAME = "e2e_dispatch";
const ADMIN_USERNAME = "e2e_admin";
const HOSPITAL_A_USERNAME = "e2e_hospital_a";
const HOSPITAL_B_USERNAME = "e2e_hospital_b";
const CASE_A_ID = "E2E-CASE-EMS-A";
const CASE_A_UID = "case-e2e-ems-a";
const CASE_C_ID = "E2E-CASE-EMS-C";
const CASE_C_UID = "case-e2e-ems-c";
const CASE_B_ID = "E2E-CASE-EMS-B";
const CASE_B_UID = "case-e2e-ems-b";
const CURRENT_CASE_DIVISIONS = [
  "本部機動",
  "1方面",
  "2方面",
  "3方面",
  "4方面",
  "5方面",
  "6方面",
  "7方面",
  "8方面",
  "9方面",
  "10方面",
] as const;

loadEnvConfig(process.cwd());

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set.");

  try {
    const url = new URL(databaseUrl);
    const sslMode = url.searchParams.get("sslmode");

    if (sslMode === "prefer" || sslMode === "require" || sslMode === "verify-ca") {
      url.searchParams.set("sslmode", "verify-full");
    }

    return url.toString();
  } catch {
    return databaseUrl;
  }
}

export default async function globalSetup() {
  const pool = new Pool({ connectionString: getDatabaseUrl() });
  const passwordHash = await hash(TEST_PASSWORD, 10);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'users_role_check'
            AND conrelid = 'users'::regclass
        ) THEN
          ALTER TABLE users DROP CONSTRAINT users_role_check;
        END IF;
      END
      $$;

      ALTER TABLE users
      ADD CONSTRAINT users_role_check
      CHECK (role IN ('EMS', 'HOSPITAL', 'ADMIN', 'DISPATCH'));

      CREATE TABLE IF NOT EXISTS login_attempts (
        id BIGSERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        ip_hash_or_ip TEXT,
        attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        success BOOLEAN NOT NULL,
        failure_reason TEXT
      );

      CREATE TABLE IF NOT EXISTS api_rate_limit_events (
        id BIGSERIAL PRIMARY KEY,
        policy_name TEXT NOT NULL,
        scope_key TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS system_monitor_events (
        id BIGSERIAL PRIMARY KEY,
        category TEXT NOT NULL,
        severity TEXT NOT NULL,
        source TEXT NOT NULL,
        message TEXT NOT NULL,
        metadata_json JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS backup_run_reports (
        id BIGSERIAL PRIMARY KEY,
        backup_type TEXT NOT NULL DEFAULT 'postgres',
        status TEXT NOT NULL,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        retention_days INTEGER,
        details_json JSONB,
        reported_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS temporary_password_expires_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

      CREATE TABLE IF NOT EXISTS user_mfa_credentials (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        credential_id TEXT NOT NULL UNIQUE,
        public_key TEXT NOT NULL,
        counter BIGINT NOT NULL DEFAULT 0,
        transports JSONB,
        device_type TEXT,
        backed_up BOOLEAN NOT NULL DEFAULT FALSE,
        name TEXT NOT NULL DEFAULT 'WebAuthn credential',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_used_at TIMESTAMPTZ,
        revoked_at TIMESTAMPTZ,
        created_by BIGINT REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS user_mfa_challenges (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        challenge TEXT NOT NULL,
        purpose TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        consumed_at TIMESTAMPTZ
      );

      ALTER TABLE cases
      ADD COLUMN IF NOT EXISTS case_payload JSONB,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS case_uid TEXT;

      ALTER TABLE hospitals
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

      ALTER TABLE hospitals
      ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

      ALTER TABLE emergency_teams
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

      ALTER TABLE emergency_teams
      ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

      ALTER TABLE emergency_teams
      ADD COLUMN IF NOT EXISTS phone TEXT,
      ADD COLUMN IF NOT EXISTS case_number_code TEXT;

      CREATE TABLE IF NOT EXISTS hospital_requests (
        id BIGSERIAL PRIMARY KEY,
        request_id TEXT NOT NULL UNIQUE,
        case_id TEXT NOT NULL,
        case_uid TEXT NOT NULL,
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
        acted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS hospital_patients (
        id BIGSERIAL PRIMARY KEY,
        target_id BIGINT NOT NULL UNIQUE REFERENCES hospital_request_targets(id) ON DELETE CASCADE,
        hospital_id INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
        case_id TEXT NOT NULL,
        case_uid TEXT NOT NULL,
        request_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'TRANSPORT_DECIDED',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id BIGSERIAL PRIMARY KEY,
        audience_role TEXT NOT NULL CHECK (audience_role IN ('EMS', 'HOSPITAL')),
        team_id INTEGER REFERENCES emergency_teams(id) ON DELETE CASCADE,
        hospital_id INTEGER REFERENCES hospitals(id) ON DELETE CASCADE,
        target_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
        kind TEXT NOT NULL,
        case_id TEXT,
        case_uid TEXT,
        target_id BIGINT REFERENCES hospital_request_targets(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        menu_key TEXT,
        tab_key TEXT,
        severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
        dedupe_key TEXT,
        expires_at TIMESTAMPTZ,
        acked_at TIMESTAMPTZ,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        read_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_notifications_dedupe_key ON notifications(dedupe_key, created_at DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_scope_dedupe_unique ON notifications(audience_role, COALESCE(team_id, -1), COALESCE(hospital_id, -1), COALESCE(target_user_id, -1), dedupe_key) WHERE dedupe_key IS NOT NULL;
    `);

    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'emergency_teams_division_check'
            AND conrelid = 'emergency_teams'::regclass
        ) THEN
          ALTER TABLE emergency_teams DROP CONSTRAINT emergency_teams_division_check;
        END IF;
      END
      $$;

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'cases_division_check'
            AND conrelid = 'cases'::regclass
        ) THEN
          ALTER TABLE cases DROP CONSTRAINT cases_division_check;
        END IF;
      END
      $$;

      UPDATE emergency_teams
      SET division = CASE division
        WHEN '1部' THEN '1方面'
        WHEN '2部' THEN '2方面'
        WHEN '3部' THEN '3方面'
        ELSE division
      END
      WHERE division IN ('1部', '2部', '3部');

      UPDATE cases
      SET division = CASE division
        WHEN '1部' THEN '1方面'
        WHEN '2部' THEN '2方面'
        WHEN '3部' THEN '3方面'
        ELSE division
      END
      WHERE division IN ('1部', '2部', '3部');

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'emergency_teams_division_check'
            AND conrelid = 'emergency_teams'::regclass
        ) THEN
          ALTER TABLE emergency_teams DROP CONSTRAINT emergency_teams_division_check;
        END IF;
      END
      $$;

      ALTER TABLE emergency_teams
      ADD CONSTRAINT emergency_teams_division_check
      CHECK (division IN (${CURRENT_CASE_DIVISIONS.map((value) => `'${value}'`).join(", ")}));

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'cases_division_check'
            AND conrelid = 'cases'::regclass
        ) THEN
          ALTER TABLE cases DROP CONSTRAINT cases_division_check;
        END IF;
      END
      $$;

      ALTER TABLE cases
      ADD CONSTRAINT cases_division_check
      CHECK (division IN (${CURRENT_CASE_DIVISIONS.map((value) => `'${value}'`).join(", ")}));

      ALTER TABLE hospital_requests
      ADD COLUMN IF NOT EXISTS patient_summary JSONB NOT NULL DEFAULT '{}'::jsonb;

      ALTER TABLE hospital_requests
      ADD COLUMN IF NOT EXISTS case_uid TEXT;

      ALTER TABLE hospital_patients
      ADD COLUMN IF NOT EXISTS case_uid TEXT;

      ALTER TABLE notifications
      ADD COLUMN IF NOT EXISTS case_uid TEXT;

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
    `);

    await client.query(
      `
        DELETE FROM login_attempts
        WHERE username = ANY($1::text[])
      `,
      [[EMS_A_USERNAME, EMS_B_USERNAME, DISPATCH_USERNAME, ADMIN_USERNAME, HOSPITAL_A_USERNAME, HOSPITAL_B_USERNAME]],
    );
    await client.query(`DELETE FROM api_rate_limit_events`);
    await client.query(`DELETE FROM system_monitor_events`);
    await client.query(`DELETE FROM backup_run_reports`);
    await client.query(
      `
        DELETE FROM notifications
        WHERE case_id LIKE 'E2E-%'
           OR case_id IN (
             SELECT c.case_id
             FROM cases c
             JOIN emergency_teams et ON et.id = c.team_id
             WHERE et.team_code = ANY($1::text[])
           )
           OR case_id IN (
             SELECT case_id
             FROM cases
             WHERE address LIKE '%E2E Dispatch%'
           )
      `,
      [[TEAM_A_CODE, TEAM_B_CODE]],
    );
    await client.query(
      `
        DELETE FROM hospital_patients
        WHERE case_id LIKE 'E2E-%'
           OR case_id IN (
             SELECT c.case_id
             FROM cases c
             JOIN emergency_teams et ON et.id = c.team_id
             WHERE et.team_code = ANY($1::text[])
           )
           OR case_id IN (
             SELECT case_id
             FROM cases
             WHERE address LIKE '%E2E Dispatch%'
           )
      `,
      [[TEAM_A_CODE, TEAM_B_CODE]],
    );
    await client.query(
      `
        DELETE FROM hospital_request_events
        WHERE target_id IN (
          SELECT t.id
          FROM hospital_request_targets t
          JOIN hospital_requests r ON r.id = t.hospital_request_id
          WHERE r.case_id LIKE 'E2E-%'
             OR r.case_id IN (
               SELECT c.case_id
               FROM cases c
               JOIN emergency_teams et ON et.id = c.team_id
               WHERE et.team_code = ANY($1::text[])
             )
             OR r.case_id IN (
               SELECT case_id
               FROM cases
               WHERE address LIKE '%E2E Dispatch%'
             )
        )
      `,
      [[TEAM_A_CODE, TEAM_B_CODE]],
    );
    await client.query(
      `
        DELETE FROM hospital_request_targets
        WHERE hospital_request_id IN (
          SELECT id
          FROM hospital_requests
          WHERE case_id LIKE 'E2E-%'
             OR case_id IN (
               SELECT c.case_id
               FROM cases c
               JOIN emergency_teams et ON et.id = c.team_id
               WHERE et.team_code = ANY($1::text[])
             )
             OR case_id IN (
               SELECT case_id
               FROM cases
               WHERE address LIKE '%E2E Dispatch%'
             )
        )
      `,
      [[TEAM_A_CODE, TEAM_B_CODE]],
    );
    await client.query(
      `
        DELETE FROM hospital_requests
        WHERE case_id LIKE 'E2E-%'
           OR case_id IN (
             SELECT c.case_id
             FROM cases c
             JOIN emergency_teams et ON et.id = c.team_id
             WHERE et.team_code = ANY($1::text[])
           )
           OR case_id IN (
             SELECT case_id
             FROM cases
             WHERE address LIKE '%E2E Dispatch%'
           )
      `,
      [[TEAM_A_CODE, TEAM_B_CODE]],
    );
    await client.query(
      `
        DELETE FROM triage_incidents
        WHERE source_case_uid IN (
          SELECT c.case_uid
          FROM cases c
          LEFT JOIN emergency_teams et ON et.id = c.team_id
          WHERE c.case_id LIKE 'E2E-%'
             OR et.team_code = ANY($1::text[])
             OR c.address LIKE '%E2E Dispatch%'
        )
      `,
      [[TEAM_A_CODE, TEAM_B_CODE]],
    );
    await client.query(
      `
        DELETE FROM cases
        WHERE case_id LIKE 'E2E-%'
           OR team_id IN (
             SELECT id
             FROM emergency_teams
             WHERE team_code = ANY($1::text[])
           )
           OR address LIKE '%E2E Dispatch%'
      `,
      [[TEAM_A_CODE, TEAM_B_CODE]],
    );
    await client.query(
      `
        DELETE FROM users
        WHERE username = ANY($1::text[])
      `,
      [[EMS_A_USERNAME, EMS_B_USERNAME, DISPATCH_USERNAME, ADMIN_USERNAME, HOSPITAL_A_USERNAME, HOSPITAL_B_USERNAME]],
    );
    await client.query(
      `
        DELETE FROM hospitals
        WHERE source_no = ANY($1::int[])
      `,
      [[HOSPITAL_A_SOURCE_NO, HOSPITAL_B_SOURCE_NO]],
    );
    await client.query(
      `
        DELETE FROM emergency_teams
        WHERE team_code = ANY($1::text[])
      `,
      [[TEAM_A_CODE, TEAM_B_CODE]],
    );

    const teamA = await client.query<{ id: number }>(
      `
        INSERT INTO emergency_teams (team_code, team_name, division, is_active, display_order, phone, case_number_code)
        VALUES ($1, $2, '1方面', TRUE, 1, '03-0000-0001', '901')
        RETURNING id
      `,
      [TEAM_A_CODE, TEAM_A_NAME],
    );
    const teamB = await client.query<{ id: number }>(
      `
        INSERT INTO emergency_teams (team_code, team_name, division, is_active, display_order, phone, case_number_code)
        VALUES ($1, $2, '2方面', TRUE, 2, '03-0000-0002', '902')
        RETURNING id
      `,
      [TEAM_B_CODE, TEAM_B_NAME],
    );

    const hospitalA = await client.query<{ id: number }>(
      `
        INSERT INTO hospitals (source_no, municipality, name, postal_code, address, phone, is_active, display_order)
        VALUES ($1, '東京', $2, '100-0001', '東京都千代田区E2E 1-1-1', '03-1111-1111', TRUE, 1)
        RETURNING id
      `,
      [HOSPITAL_A_SOURCE_NO, HOSPITAL_A_NAME],
    );
    const hospitalB = await client.query<{ id: number }>(
      `
        INSERT INTO hospitals (source_no, municipality, name, postal_code, address, phone, is_active, display_order)
        VALUES ($1, '東京', $2, '100-0002', '東京都千代田区E2E 2-2-2', '03-2222-2222', TRUE, 2)
        RETURNING id
      `,
      [HOSPITAL_B_SOURCE_NO, HOSPITAL_B_NAME],
    );

    await client.query(
      `
        INSERT INTO users (username, password_hash, role, display_name, team_id, hospital_id, is_active, updated_at)
        VALUES
          ($1, $2, 'EMS', 'E2E EMS A', $3, NULL, TRUE, NOW()),
          ($4, $2, 'EMS', 'E2E EMS B', $5, NULL, TRUE, NOW()),
          ($6, $2, 'DISPATCH', 'E2E DISPATCH', NULL, NULL, TRUE, NOW()),
          ($7, $2, 'ADMIN', 'E2E ADMIN', NULL, NULL, TRUE, NOW()),
          ($8, $2, 'HOSPITAL', 'E2E HOSPITAL A', NULL, $9, TRUE, NOW()),
          ($10, $2, 'HOSPITAL', 'E2E HOSPITAL B', NULL, $11, TRUE, NOW())
      `,
      [
        EMS_A_USERNAME,
        passwordHash,
        teamA.rows[0].id,
        EMS_B_USERNAME,
        teamB.rows[0].id,
        DISPATCH_USERNAME,
        ADMIN_USERNAME,
        HOSPITAL_A_USERNAME,
        hospitalA.rows[0].id,
        HOSPITAL_B_USERNAME,
        hospitalB.rows[0].id,
      ],
    );

    const casePayloadA = {
      basic: {
        caseId: CASE_A_ID,
        name: "E2E 太郎",
        gender: "male",
        age: 45,
        calculatedAge: 45,
        address: "東京都港区E2E 3-3-3",
        teamCode: TEAM_A_CODE,
        teamName: TEAM_A_NAME,
      },
      summary: {
        chiefComplaint: "胸痛",
        dispatchSummary: "E2E dispatch summary A",
      },
      vitals: [],
    };
    const casePayloadB = {
      basic: {
        caseId: CASE_B_ID,
        name: "E2E 花子",
        gender: "female",
        age: 38,
        calculatedAge: 38,
        address: "東京都新宿区E2E 4-4-4",
        teamCode: TEAM_B_CODE,
        teamName: TEAM_B_NAME,
      },
      summary: {
        chiefComplaint: "腹痛",
        dispatchSummary: "E2E dispatch summary B",
      },
      vitals: [],
    };

    await client.query(
      `
        INSERT INTO cases (
          case_id, case_uid, division, aware_date, aware_time, patient_name, age, address, symptom, destination, note, team_id, case_payload, updated_at
        ) VALUES
          ($1, $2, '1方面', '2026-03-08', '10:00', 'E2E 太郎', 45, '東京都港区E2E 3-3-3', '胸痛', NULL, NULL, $3, $4::jsonb, NOW()),
          ($5, $6, '1方面', '2026-03-08', '10:20', 'E2E 次郎', 61, '東京都渋谷区E2E 5-5-5', '呼吸苦', NULL, NULL, $7, $8::jsonb, NOW()),
          ($9, $10, '2方面', '2026-03-08', '11:00', 'E2E 花子', 38, '東京都新宿区E2E 4-4-4', '腹痛', NULL, NULL, $11, $12::jsonb, NOW())
      `,
      [
        CASE_A_ID,
        CASE_A_UID,
        teamA.rows[0].id,
        JSON.stringify(casePayloadA),
        CASE_C_ID,
        CASE_C_UID,
        teamA.rows[0].id,
        JSON.stringify({
          ...casePayloadA,
          summary: {
            chiefComplaint: "呼吸苦",
            dispatchSummary: "E2E dispatch summary C",
          },
        }),
        CASE_B_ID,
        CASE_B_UID,
        teamB.rows[0].id,
        JSON.stringify(casePayloadB),
      ],
    );

    const requestA = await client.query<{ id: number }>(
      `
        INSERT INTO hospital_requests (
          request_id, case_id, case_uid, mode, patient_summary, from_team_id, created_by_user_id, first_sent_at, sent_at, updated_at
        ) VALUES ($1, $2, $3, 'LIVE', $4::jsonb, $5, NULL, NOW() - INTERVAL '18 minutes', NOW() - INTERVAL '18 minutes', NOW())
        RETURNING id
      `,
      ["E2E-REQ-A", CASE_A_ID, CASE_A_UID, JSON.stringify(casePayloadA.basic), teamA.rows[0].id],
    );
    const requestB = await client.query<{ id: number }>(
      `
        INSERT INTO hospital_requests (
          request_id, case_id, case_uid, mode, patient_summary, from_team_id, created_by_user_id, first_sent_at, sent_at, updated_at
        ) VALUES ($1, $2, $3, 'LIVE', $4::jsonb, $5, NULL, NOW() - INTERVAL '16 minutes', NOW() - INTERVAL '16 minutes', NOW())
        RETURNING id
      `,
      ["E2E-REQ-B", CASE_B_ID, CASE_B_UID, JSON.stringify(casePayloadB.basic), teamB.rows[0].id],
    );
    const requestC = await client.query<{ id: number }>(
      `
        INSERT INTO hospital_requests (
          request_id, case_id, case_uid, mode, patient_summary, from_team_id, created_by_user_id, first_sent_at, sent_at, updated_at
        ) VALUES ($1, $2, $3, 'LIVE', $4::jsonb, $5, NULL, NOW() - INTERVAL '22 minutes', NOW() - INTERVAL '22 minutes', NOW())
        RETURNING id
      `,
      ["E2E-REQ-C", CASE_C_ID, CASE_C_UID, JSON.stringify(casePayloadA.basic), teamA.rows[0].id],
    );

    const targetA1 = await client.query<{ id: number }>(
      `
        INSERT INTO hospital_request_targets (
          hospital_request_id, hospital_id, status, selected_departments, updated_at
        ) VALUES ($1, $2, 'NEGOTIATING', '["内科"]'::jsonb, NOW() - INTERVAL '11 minutes')
        RETURNING id
      `,
      [requestA.rows[0].id, hospitalA.rows[0].id],
    );
    const targetA2 = await client.query<{ id: number }>(
      `
        INSERT INTO hospital_request_targets (
          hospital_request_id, hospital_id, status, selected_departments, updated_at
        ) VALUES ($1, $2, 'ACCEPTABLE', '["救急科"]'::jsonb, NOW() - INTERVAL '2 minutes')
        RETURNING id
      `,
      [requestA.rows[0].id, hospitalB.rows[0].id],
    );
    const targetB1 = await client.query<{ id: number }>(
      `
        INSERT INTO hospital_request_targets (
          hospital_request_id, hospital_id, status, selected_departments, updated_at
        ) VALUES ($1, $2, 'READ', '["外科"]'::jsonb, NOW() - INTERVAL '1 minute')
        RETURNING id
      `,
      [requestB.rows[0].id, hospitalA.rows[0].id],
    );
    const targetC1 = await client.query<{ id: number }>(
      `
        INSERT INTO hospital_request_targets (
          hospital_request_id, hospital_id, status, selected_departments, updated_at
        ) VALUES ($1, $2, 'NEGOTIATING', '["内科"]'::jsonb, NOW() - INTERVAL '12 minutes')
        RETURNING id
      `,
      [requestC.rows[0].id, hospitalA.rows[0].id],
    );

    await client.query(
      `
        INSERT INTO hospital_request_events (target_id, event_type, from_status, to_status, note, acted_at)
        VALUES
          ($1, 'sent', NULL, 'UNREAD', NULL, NOW() - INTERVAL '18 minutes'),
          ($1, 'hospital_response', 'READ', 'NEGOTIATING', 'E2E comment A1', NOW() - INTERVAL '11 minutes'),
          ($2, 'sent', NULL, 'UNREAD', NULL, NOW() - INTERVAL '18 minutes'),
          ($2, 'hospital_response', 'READ', 'ACCEPTABLE', 'E2E comment A2', NOW() - INTERVAL '2 minutes'),
          ($3, 'sent', NULL, 'UNREAD', NULL, NOW() - INTERVAL '16 minutes'),
          ($4, 'sent', NULL, 'UNREAD', NULL, NOW() - INTERVAL '22 minutes'),
          ($4, 'hospital_response', 'READ', 'NEGOTIATING', 'E2E comment C1', NOW() - INTERVAL '12 minutes')
      `,
      [targetA1.rows[0].id, targetA2.rows[0].id, targetB1.rows[0].id, targetC1.rows[0].id],
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
