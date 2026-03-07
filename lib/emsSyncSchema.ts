import { db } from "@/lib/db";

let ensured = false;

export async function ensureEmsSyncSchema() {
  if (ensured) return;

  await db.query(`
    CREATE TABLE IF NOT EXISTS ems_sync_state (
      user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      last_sync_at TIMESTAMPTZ,
      last_retry_at TIMESTAMPTZ,
      last_sync_status TEXT NOT NULL DEFAULT 'idle',
      last_retry_status TEXT NOT NULL DEFAULT 'idle',
      pending_count INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (last_sync_status IN ('idle', 'success', 'error')),
      CHECK (last_retry_status IN ('idle', 'success', 'error'))
    );
  `);

  ensured = true;
}
