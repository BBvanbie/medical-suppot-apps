import { db } from "@/lib/db";

let attempted = false;

export async function ensureCasesColumns() {
  if (attempted) return;
  attempted = true;

  try {
    await db.query(`
      ALTER TABLE cases
      ADD COLUMN IF NOT EXISTS case_payload JSONB,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
