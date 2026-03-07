import { db } from "@/lib/db";

let ensured = false;

export async function ensureAdminManagementSchema() {
  if (ensured) return;

  await db.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGSERIAL PRIMARY KEY,
      actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      before_json JSONB,
      after_json JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_audit_logs_target
      ON audit_logs(target_type, target_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_audit_logs_actor
      ON audit_logs(actor_user_id, created_at DESC);

    ALTER TABLE hospitals
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

    ALTER TABLE emergency_teams
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
  `);

  ensured = true;
}
