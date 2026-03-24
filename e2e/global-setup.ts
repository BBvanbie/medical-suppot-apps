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
const CASE_A_ID = "E2E-CASE-EMS-A";
const CASE_B_ID = "E2E-CASE-EMS-B";

loadEnvConfig(process.cwd());

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set.");
  return databaseUrl;
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
    `);

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
      [[EMS_A_USERNAME, EMS_B_USERNAME, DISPATCH_USERNAME, ADMIN_USERNAME, HOSPITAL_A_USERNAME]],
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
        VALUES ($1, $2, '1方面', TRUE, 1, '03-0000-0001', '101')
        RETURNING id
      `,
      [TEAM_A_CODE, TEAM_A_NAME],
    );
    const teamB = await client.query<{ id: number }>(
      `
        INSERT INTO emergency_teams (team_code, team_name, division, is_active, display_order, phone, case_number_code)
        VALUES ($1, $2, '2方面', TRUE, 2, '03-0000-0002', '202')
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
          ($8, $2, 'HOSPITAL', 'E2E HOSPITAL A', NULL, $9, TRUE, NOW())
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
          ($5, $6, '2方面', '2026-03-08', '11:00', 'E2E 花子', 38, '東京都新宿区E2E 4-4-4', '腹痛', NULL, NULL, $7, $8::jsonb, NOW())
      `,
      [CASE_A_ID, 'case-e2e-ems-a', teamA.rows[0].id, JSON.stringify(casePayloadA), CASE_B_ID, 'case-e2e-ems-b', teamB.rows[0].id, JSON.stringify(casePayloadB)],
    );

    const requestA = await client.query<{ id: number }>(
      `
        INSERT INTO hospital_requests (
          request_id, case_id, patient_summary, from_team_id, created_by_user_id, sent_at, updated_at
        ) VALUES ($1, $2, $3::jsonb, $4, NULL, NOW() - INTERVAL '10 minutes', NOW())
        RETURNING id
      `,
      ["E2E-REQ-A", CASE_A_ID, JSON.stringify(casePayloadA.basic), teamA.rows[0].id],
    );
    const requestB = await client.query<{ id: number }>(
      `
        INSERT INTO hospital_requests (
          request_id, case_id, patient_summary, from_team_id, created_by_user_id, sent_at, updated_at
        ) VALUES ($1, $2, $3::jsonb, $4, NULL, NOW() - INTERVAL '5 minutes', NOW())
        RETURNING id
      `,
      ["E2E-REQ-B", CASE_B_ID, JSON.stringify(casePayloadB.basic), teamB.rows[0].id],
    );

    const targetA1 = await client.query<{ id: number }>(
      `
        INSERT INTO hospital_request_targets (
          hospital_request_id, hospital_id, status, selected_departments, updated_at
        ) VALUES ($1, $2, 'NEGOTIATING', '["内科"]'::jsonb, NOW() - INTERVAL '4 minutes')
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

    await client.query(
      `
        INSERT INTO hospital_request_events (target_id, event_type, from_status, to_status, note, acted_at)
        VALUES
          ($1, 'sent', NULL, 'UNREAD', NULL, NOW() - INTERVAL '10 minutes'),
          ($1, 'hospital_response', 'READ', 'NEGOTIATING', 'E2E comment A1', NOW() - INTERVAL '4 minutes'),
          ($2, 'sent', NULL, 'UNREAD', NULL, NOW() - INTERVAL '10 minutes'),
          ($2, 'hospital_response', 'READ', 'ACCEPTABLE', 'E2E comment A2', NOW() - INTERVAL '2 minutes'),
          ($3, 'sent', NULL, 'UNREAD', NULL, NOW() - INTERVAL '5 minutes')
      `,
      [targetA1.rows[0].id, targetA2.rows[0].id, targetB1.rows[0].id],
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
