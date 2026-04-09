import { db } from "@/lib/db";

let ensured = false;

export async function ensureSecurityAuthSchema() {
  if (ensured) return;

  await db.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1;

    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS temporary_password_expires_at TIMESTAMPTZ;

    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

    CREATE TABLE IF NOT EXISTS login_attempts (
      id BIGSERIAL PRIMARY KEY,
      username TEXT NOT NULL,
      ip_hash_or_ip TEXT,
      attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      success BOOLEAN NOT NULL,
      failure_reason TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_login_attempts_username_attempted
      ON login_attempts(username, attempted_at DESC);

    CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_attempted
      ON login_attempts(ip_hash_or_ip, attempted_at DESC);

    CREATE TABLE IF NOT EXISTS user_security_devices (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      device_key TEXT NOT NULL,
      pin_hash TEXT,
      pin_updated_at TIMESTAMPTZ,
      pin_failed_attempts INTEGER NOT NULL DEFAULT 0,
      pin_locked_until TIMESTAMPTZ,
      last_activity_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, device_key)
    );

    CREATE INDEX IF NOT EXISTS idx_user_security_devices_user
      ON user_security_devices(user_id, updated_at DESC);

    ALTER TABLE devices
      ADD COLUMN IF NOT EXISTS registration_required BOOLEAN NOT NULL DEFAULT FALSE;

    ALTER TABLE devices
      ADD COLUMN IF NOT EXISTS registration_code_hash TEXT;

    ALTER TABLE devices
      ADD COLUMN IF NOT EXISTS registration_code_expires_at TIMESTAMPTZ;

    ALTER TABLE devices
      ADD COLUMN IF NOT EXISTS registration_code_issued_at TIMESTAMPTZ;

    ALTER TABLE devices
      ADD COLUMN IF NOT EXISTS registration_code_issued_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

    ALTER TABLE devices
      ADD COLUMN IF NOT EXISTS registered_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

    ALTER TABLE devices
      ADD COLUMN IF NOT EXISTS registered_device_key TEXT;

    ALTER TABLE devices
      ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ;

    CREATE INDEX IF NOT EXISTS idx_devices_registered_user
      ON devices(registered_user_id, created_at DESC);
  `);

  ensured = true;
}
