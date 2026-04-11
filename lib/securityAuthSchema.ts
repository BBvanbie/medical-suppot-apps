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

    CREATE TABLE IF NOT EXISTS user_mfa_credentials (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      credential_id TEXT NOT NULL UNIQUE,
      public_key TEXT NOT NULL,
      counter BIGINT NOT NULL DEFAULT 0,
      transports JSONB,
      device_type TEXT,
      backed_up BOOLEAN NOT NULL DEFAULT FALSE,
      name TEXT NOT NULL DEFAULT 'WebAuthn credential',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_used_at TIMESTAMPTZ,
      revoked_at TIMESTAMPTZ,
      created_by BIGINT REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_user_mfa_credentials_user
      ON user_mfa_credentials(user_id, revoked_at, created_at DESC);

    CREATE TABLE IF NOT EXISTS user_mfa_challenges (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      challenge TEXT NOT NULL,
      purpose TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      consumed_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_user_mfa_challenges_user_purpose
      ON user_mfa_challenges(user_id, purpose, expires_at DESC);
  `);

  ensured = true;
}
