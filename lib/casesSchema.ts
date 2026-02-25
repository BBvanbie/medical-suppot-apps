import { db } from "@/lib/db";

export async function ensureCasesColumns() {
  await db.query(`
    ALTER TABLE cases
    ADD COLUMN IF NOT EXISTS case_payload JSONB,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  `);
}
