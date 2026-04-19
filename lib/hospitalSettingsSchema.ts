import { db } from "@/lib/db";
import { rethrowSchemaEnsureError } from "@/lib/schemaEnsure";

let ensured = false;
let attempted = false;
let ensurePromise: Promise<void> | null = null;

export async function ensureHospitalSettingsSchema() {
  if (ensured) return;
  if (ensurePromise) return ensurePromise;
  if (attempted) return;

  ensurePromise = (async () => {
    attempted = true;

    try {
      await db.query(`
    CREATE TABLE IF NOT EXISTS hospital_settings (
      hospital_id INTEGER PRIMARY KEY REFERENCES hospitals(id) ON DELETE CASCADE,
      display_contact TEXT NOT NULL DEFAULT '',
      facility_note TEXT NOT NULL DEFAULT '',
      consult_template TEXT NOT NULL DEFAULT '',
      decline_template TEXT NOT NULL DEFAULT '',
      notify_new_request BOOLEAN NOT NULL DEFAULT TRUE,
      notify_reply_arrival BOOLEAN NOT NULL DEFAULT TRUE,
      notify_transport_decided BOOLEAN NOT NULL DEFAULT TRUE,
      notify_transport_declined BOOLEAN NOT NULL DEFAULT TRUE,
      notify_repeat BOOLEAN NOT NULL DEFAULT FALSE,
      notify_reply_delay BOOLEAN NOT NULL DEFAULT TRUE,
      reply_delay_minutes INTEGER NOT NULL DEFAULT 10,
      display_density TEXT NOT NULL DEFAULT 'standard',
      default_sort TEXT NOT NULL DEFAULT 'updated',
      response_target_minutes INTEGER NOT NULL DEFAULT 15,
      CHECK (reply_delay_minutes IN (10, 15, 20)),
      CHECK (display_density IN ('standard', 'comfortable', 'compact')),
      CHECK (default_sort IN ('updated', 'received', 'priority')),
      CHECK (response_target_minutes BETWEEN 1 AND 180),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE hospital_settings
      ADD COLUMN IF NOT EXISTS consult_template TEXT NOT NULL DEFAULT '';

    ALTER TABLE hospital_settings
      ADD COLUMN IF NOT EXISTS decline_template TEXT NOT NULL DEFAULT '';

    ALTER TABLE hospital_settings
      ADD COLUMN IF NOT EXISTS notify_new_request BOOLEAN NOT NULL DEFAULT TRUE;

    ALTER TABLE hospital_settings
      ADD COLUMN IF NOT EXISTS notify_reply_arrival BOOLEAN NOT NULL DEFAULT TRUE;

    ALTER TABLE hospital_settings
      ADD COLUMN IF NOT EXISTS notify_transport_decided BOOLEAN NOT NULL DEFAULT TRUE;

    ALTER TABLE hospital_settings
      ADD COLUMN IF NOT EXISTS notify_transport_declined BOOLEAN NOT NULL DEFAULT TRUE;

    ALTER TABLE hospital_settings
      ADD COLUMN IF NOT EXISTS notify_repeat BOOLEAN NOT NULL DEFAULT FALSE;

    ALTER TABLE hospital_settings
      ADD COLUMN IF NOT EXISTS notify_reply_delay BOOLEAN NOT NULL DEFAULT TRUE;

    ALTER TABLE hospital_settings
      ADD COLUMN IF NOT EXISTS reply_delay_minutes INTEGER NOT NULL DEFAULT 10;

    ALTER TABLE hospital_settings
      ADD COLUMN IF NOT EXISTS display_density TEXT NOT NULL DEFAULT 'standard';

    ALTER TABLE hospital_settings
      ADD COLUMN IF NOT EXISTS default_sort TEXT NOT NULL DEFAULT 'updated';

    ALTER TABLE hospital_settings
      ADD COLUMN IF NOT EXISTS response_target_minutes INTEGER NOT NULL DEFAULT 15;
  `);
      ensured = true;
    } catch (error) {
      attempted = false;
      rethrowSchemaEnsureError("ensureHospitalSettingsSchema", error);
    } finally {
      ensurePromise = null;
    }
  })();

  return ensurePromise;
}
