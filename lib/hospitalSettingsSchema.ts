import { db } from "@/lib/db";

let ensured = false;

export async function ensureHospitalSettingsSchema() {
  if (ensured) return;

  await db.query(`
    CREATE TABLE IF NOT EXISTS hospital_settings (
      hospital_id INTEGER PRIMARY KEY REFERENCES hospitals(id) ON DELETE CASCADE,
      display_contact TEXT NOT NULL DEFAULT '',
      facility_note TEXT NOT NULL DEFAULT '',
      consult_template TEXT NOT NULL DEFAULT '',
      decline_template TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE hospital_settings
      ADD COLUMN IF NOT EXISTS consult_template TEXT NOT NULL DEFAULT '';

    ALTER TABLE hospital_settings
      ADD COLUMN IF NOT EXISTS decline_template TEXT NOT NULL DEFAULT '';
  `);

  ensured = true;
}
