import { db } from "@/lib/db";
import { rethrowSchemaEnsureError } from "@/lib/schemaEnsure";

let ensured = false;
let attempted = false;
let ensurePromise: Promise<void> | null = null;

export async function ensureEmsSyncSchema() {
  if (ensured) return;
  if (ensurePromise) return ensurePromise;
  if (attempted) return;

  ensurePromise = (async () => {
    attempted = true;

    try {
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
    } catch (error) {
      attempted = false;
      rethrowSchemaEnsureError("ensureEmsSyncSchema", error);
    } finally {
      ensurePromise = null;
    }
  })();

  return ensurePromise;
}
