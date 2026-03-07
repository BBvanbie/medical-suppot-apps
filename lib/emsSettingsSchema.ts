import { db } from "@/lib/db";

let ensured = false;

export async function ensureEmsSettingsSchema() {
  if (ensured) return;

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
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (display_text_size IN ('standard', 'large', 'xlarge')),
      CHECK (display_density IN ('standard', 'comfortable', 'compact'))
    );
  `);

  ensured = true;
}
