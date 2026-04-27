import { db } from "@/lib/db";
import { rethrowSchemaEnsureError } from "@/lib/schemaEnsure";

let ensured = false;
let attempted = false;
let ensurePromise: Promise<void> | null = null;

export async function ensureEmsSettingsSchema() {
  if (ensured) return;
  if (ensurePromise) return ensurePromise;
  if (attempted) return;

  ensurePromise = (async () => {
    attempted = true;

    try {
      await db.query(`
    CREATE TABLE IF NOT EXISTS ems_user_settings (
      user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      notify_new_response BOOLEAN NOT NULL DEFAULT TRUE,
      notify_consult BOOLEAN NOT NULL DEFAULT TRUE,
      notify_accepted BOOLEAN NOT NULL DEFAULT TRUE,
      notify_declined BOOLEAN NOT NULL DEFAULT FALSE,
      notify_repeat BOOLEAN NOT NULL DEFAULT TRUE,
      display_text_size TEXT NOT NULL DEFAULT 'standard',
      display_density TEXT NOT NULL DEFAULT 'standard',
      input_auto_tenkey BOOLEAN NOT NULL DEFAULT TRUE,
      input_auto_focus BOOLEAN NOT NULL DEFAULT TRUE,
      input_vitals_next BOOLEAN NOT NULL DEFAULT TRUE,
      input_required_alert BOOLEAN NOT NULL DEFAULT TRUE,
      operational_mode TEXT NOT NULL DEFAULT 'STANDARD',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (display_text_size IN ('standard', 'large', 'xlarge')),
      CHECK (display_density IN ('standard', 'comfortable', 'compact')),
      CHECK (operational_mode IN ('STANDARD', 'TRIAGE'))
    );
  `);
      await db.query(`
    ALTER TABLE ems_user_settings
      ADD COLUMN IF NOT EXISTS operational_mode TEXT NOT NULL DEFAULT 'STANDARD'
  `);
      await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ems_user_settings_operational_mode_check'
          AND conrelid = 'ems_user_settings'::regclass
      ) THEN
        ALTER TABLE ems_user_settings
          ADD CONSTRAINT ems_user_settings_operational_mode_check
          CHECK (operational_mode IN ('STANDARD', 'TRIAGE'));
      END IF;
    END
    $$;
  `);
      ensured = true;
    } catch (error) {
      attempted = false;
      rethrowSchemaEnsureError("ensureEmsSettingsSchema", error);
    } finally {
      ensurePromise = null;
    }
  })();

  return ensurePromise;
}
