import { db } from "@/lib/db";
import { rethrowSchemaEnsureError } from "@/lib/schemaEnsure";

let ensured = false;
let attempted = false;
let ensurePromise: Promise<void> | null = null;

export async function ensureUserModeSchema() {
  if (ensured) return;
  if (ensurePromise) return ensurePromise;
  if (attempted) return;

  ensurePromise = (async () => {
    attempted = true;

    try {
      await db.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS current_mode TEXT NOT NULL DEFAULT 'LIVE';

    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_current_mode_check'
          AND conrelid = 'users'::regclass
      ) THEN
        ALTER TABLE users DROP CONSTRAINT users_current_mode_check;
      END IF;
    END
    $$;

    ALTER TABLE users
      ADD CONSTRAINT users_current_mode_check
      CHECK (current_mode IN ('LIVE', 'TRAINING'));
  `);
      ensured = true;
    } catch (error) {
      attempted = false;
      rethrowSchemaEnsureError("ensureUserModeSchema", error);
    } finally {
      ensurePromise = null;
    }
  })();

  return ensurePromise;
}
