import { db } from "@/lib/db";

let attempted = false;

export async function ensureCasesColumns() {
  if (attempted) return;
  attempted = true;

  try {
    await db.query(`
      ALTER TABLE cases
      ADD COLUMN IF NOT EXISTS case_payload JSONB,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS case_uid TEXT;

      UPDATE cases
      SET case_uid = 'case-' || LPAD(id::text, 10, '0')
      WHERE case_uid IS NULL;

      ALTER TABLE cases
      ALTER COLUMN case_uid SET NOT NULL;

      CREATE UNIQUE INDEX IF NOT EXISTS idx_cases_case_uid_unique
        ON cases(case_uid)
    `);
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code === "42501") {
      console.warn("ensureCasesColumns skipped due to insufficient DB privilege (42501).");
      return;
    }
    throw error;
  }
}
