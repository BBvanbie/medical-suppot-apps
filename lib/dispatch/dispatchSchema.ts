import { CURRENT_CASE_DIVISIONS } from "@/lib/caseDivision";
import { TEAM_CASE_NUMBER_CODE_WIDTH } from "@/lib/caseIdentity";
import { db } from "@/lib/db";
import { rethrowSchemaEnsureError } from "@/lib/schemaEnsure";

let ensured = false;
let attempted = false;
let ensurePromise: Promise<void> | null = null;

export async function ensureDispatchSchema() {
  if (ensured) return;
  if (ensurePromise) return ensurePromise;
  if (attempted) return;

  ensurePromise = (async () => {
    attempted = true;

    try {
      const caseDivisionList = CURRENT_CASE_DIVISIONS.map((value) => `'${value}'`).join(", ");
      const teamCodePattern = `^[0-9]{${TEAM_CASE_NUMBER_CODE_WIDTH}}$`;
      await db.query(`
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
        ADD COLUMN IF NOT EXISTS dispatch_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS case_payload JSONB,
        ADD COLUMN IF NOT EXISTS created_from TEXT,
        ADD COLUMN IF NOT EXISTS created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS case_status TEXT NOT NULL DEFAULT 'NEW',
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS case_uid TEXT;

      ALTER TABLE emergency_teams
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS case_number_code TEXT;

      UPDATE cases AS c
      SET division = et.division
      FROM emergency_teams AS et
      WHERE c.team_id = et.id
        AND c.division IS DISTINCT FROM et.division;

      UPDATE cases
      SET division = CASE division
        WHEN '1部' THEN '1方面'
        WHEN '2部' THEN '2方面'
        WHEN '3部' THEN '3方面'
        ELSE division
      END
      WHERE division IN ('1部', '2部', '3部');

      UPDATE cases
      SET case_uid = 'case-' || LPAD(id::text, 10, '0')
      WHERE case_uid IS NULL;

      UPDATE emergency_teams
      SET case_number_code = reassigned.code
      FROM (
        WITH normalized_codes AS (
          SELECT
            id,
            CASE
              WHEN case_number_code ~ '^[0-9]{3}$' THEN case_number_code
              ELSE NULL
            END AS normalized_code
          FROM emergency_teams
        ),
        ranked_codes AS (
          SELECT
            id,
            normalized_code,
            ROW_NUMBER() OVER (PARTITION BY normalized_code ORDER BY id) AS code_rank
          FROM normalized_codes
        ),
        teams_needing_codes AS (
          SELECT
            id,
            ROW_NUMBER() OVER (ORDER BY id) AS assignment_rank
          FROM ranked_codes
          WHERE normalized_code IS NULL OR code_rank > 1
        ),
        available_codes AS (
          SELECT
            LPAD(series.code::text, 3, '0') AS code,
            ROW_NUMBER() OVER (ORDER BY series.code) AS assignment_rank
          FROM generate_series(1, 999) AS series(code)
          WHERE NOT EXISTS (
            SELECT 1
            FROM ranked_codes existing
            WHERE existing.normalized_code = LPAD(series.code::text, 3, '0')
              AND existing.code_rank = 1
          )
        )
        SELECT teams_needing_codes.id, available_codes.code
        FROM teams_needing_codes
        JOIN available_codes USING (assignment_rank)
      ) AS reassigned
      WHERE emergency_teams.id = reassigned.id;

      ALTER TABLE cases
        ALTER COLUMN patient_name DROP NOT NULL,
        ALTER COLUMN age DROP NOT NULL,
        ALTER COLUMN case_uid SET NOT NULL;

      ALTER TABLE emergency_teams
        ALTER COLUMN case_number_code SET NOT NULL;

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
        CHECK (division IN (${caseDivisionList}));

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'emergency_teams_case_number_code_check'
            AND conrelid = 'emergency_teams'::regclass
        ) THEN
          ALTER TABLE emergency_teams DROP CONSTRAINT emergency_teams_case_number_code_check;
        END IF;
      END
      $$;

      ALTER TABLE emergency_teams
        ADD CONSTRAINT emergency_teams_case_number_code_check
        CHECK (case_number_code ~ '${teamCodePattern}');

      CREATE UNIQUE INDEX IF NOT EXISTS idx_cases_case_uid_unique
        ON cases(case_uid);

      CREATE UNIQUE INDEX IF NOT EXISTS idx_emergency_teams_case_number_code_unique
        ON emergency_teams(case_number_code);

      CREATE INDEX IF NOT EXISTS idx_cases_created_from_created_at
        ON cases(created_from, created_at DESC, id DESC);

      CREATE INDEX IF NOT EXISTS idx_cases_dispatch_at
        ON cases(dispatch_at DESC, id DESC);
    `);
      ensured = true;
    } catch (error) {
      attempted = false;
      rethrowSchemaEnsureError("ensureDispatchSchema", error);
    } finally {
      ensurePromise = null;
    }
  })();

  return ensurePromise;
}
