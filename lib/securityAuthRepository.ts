import { compare, hash } from "bcryptjs";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import type { AuthenticatedUser } from "@/lib/authContext";
import { writeAuditLog } from "@/lib/auditLog";
import { db } from "@/lib/db";
import { clearLoginRateLimitForUsername } from "@/lib/rateLimit";
import { ensureSecurityAuthSchema } from "@/lib/securityAuthSchema";
import { SECURITY_DEVICE_KEY_COOKIE, SECURITY_DEVICE_KEY_HEADER } from "@/lib/securityAuthShared";
import { hashMonitorValue, recordSecuritySignalEvent } from "@/lib/systemMonitor";

const LOGIN_WINDOW_MINUTES = 5;
const LOGIN_FAILURE_LIMIT = 5;
const LOGIN_LOCK_MINUTES = 15;
const REGISTRATION_CODE_HOURS = 24;

export type SecurityUserRow = {
  id: number;
  username: string;
  password_hash: string;
  role: string;
  display_name: string;
  session_version: number;
  must_change_password: boolean;
  temporary_password_expires_at: Date | string | null;
  locked_until: Date | string | null;
};

export type DeviceTrustState = {
  deviceTrusted: boolean;
  deviceEnforcementRequired: boolean;
  deviceName: string | null;
};

function toIsoString(value: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
}

function normalizeDeviceKey(raw: string | null | undefined) {
  const value = String(raw ?? "").trim();
  return value && value.length <= 200 ? value : randomUUID();
}

function hashIp(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  return createHash("sha256").update(normalized).digest("hex");
}

function hashRegistrationCode(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function resolveClientIp(request?: Request) {
  if (!request) return null;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  return request.headers.get("x-real-ip");
}

export function resolveDeviceKey(request: Request) {
  const fromHeader = request.headers.get(SECURITY_DEVICE_KEY_HEADER);
  if (fromHeader) return normalizeDeviceKey(fromHeader);

  const cookieHeader = request.headers.get("cookie");
  const cookieMatch = cookieHeader
    ?.split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${SECURITY_DEVICE_KEY_COOKIE}=`));

  if (!cookieMatch) return normalizeDeviceKey(null);
  return normalizeDeviceKey(decodeURIComponent(cookieMatch.slice(`${SECURITY_DEVICE_KEY_COOKIE}=`.length)));
}

export async function getDeviceTrustStateForUser(input: {
  userId: number;
  role: string;
  teamId: number | null;
  hospitalId: number | null;
  deviceKey: string | null | undefined;
}): Promise<DeviceTrustState> {
  await ensureSecurityAuthSchema();

  if (!["EMS", "HOSPITAL"].includes(input.role)) {
    return {
      deviceTrusted: true,
      deviceEnforcementRequired: false,
      deviceName: null,
    };
  }

  const deviceKey = normalizeDeviceKey(input.deviceKey);
  const scopeResult =
    input.role === "EMS"
      ? await db.query<{
          registration_required: boolean;
          registered_device_key: string | null;
          registered_user_id: number | null;
          device_name: string;
        }>(
          `
            SELECT registration_required, registered_device_key, registered_user_id, device_name
            FROM devices
            WHERE role_scope = 'EMS'
              AND team_id = $1
              AND is_active = TRUE
              AND is_lost = FALSE
          `,
          [input.teamId],
        )
      : await db.query<{
          registration_required: boolean;
          registered_device_key: string | null;
          registered_user_id: number | null;
          device_name: string;
        }>(
          `
            SELECT registration_required, registered_device_key, registered_user_id, device_name
            FROM devices
            WHERE role_scope = 'HOSPITAL'
              AND hospital_id = $1
              AND is_active = TRUE
              AND is_lost = FALSE
          `,
          [input.hospitalId],
        );

  const rows = scopeResult.rows;
  const deviceEnforcementRequired = rows.some((row) => row.registration_required);
  const trustedRow = rows.find(
    (row) => row.registered_device_key === deviceKey && row.registered_user_id === input.userId,
  );

  return {
    deviceTrusted: Boolean(trustedRow),
    deviceEnforcementRequired,
    deviceName: trustedRow?.device_name ?? null,
  };
}

export function generateRegistrationCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  const chars = Array.from(bytes, (value) => alphabet[value % alphabet.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}`;
}

export async function issueDeviceRegistrationCode(input: {
  deviceId: number;
  actor: AuthenticatedUser;
}) {
  await ensureSecurityAuthSchema();
  const code = generateRegistrationCode();
  const codeHash = hashRegistrationCode(code);
  const expiresAt = new Date(Date.now() + REGISTRATION_CODE_HOURS * 60 * 60 * 1000);

  const result = await db.query<{
    id: number;
    device_name: string;
    role_scope: "EMS" | "HOSPITAL";
    team_id: number | null;
    hospital_id: number | null;
  }>(
    `
      UPDATE devices
      SET
        registration_required = TRUE,
        registration_code_hash = $2,
        registration_code_expires_at = $3,
        registration_code_issued_at = NOW(),
        registration_code_issued_by = $4,
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, device_name, role_scope, team_id, hospital_id
    `,
    [input.deviceId, codeHash, expiresAt.toISOString(), input.actor.id],
  );

  const row = result.rows[0];
  if (!row) return null;

  await writeAuditLog({
    actor: input.actor,
    action: "security.device.issueRegistrationCode",
    targetType: "device",
    targetId: String(row.id),
    metadata: {
      roleScope: row.role_scope,
      teamId: row.team_id,
      hospitalId: row.hospital_id,
      expiresAt: expiresAt.toISOString(),
    },
  });

  return {
    code,
    expiresAt: expiresAt.toISOString(),
    deviceName: row.device_name,
  };
}

export async function registerCurrentDevice(input: {
  actor: AuthenticatedUser;
  deviceKey: string;
  registrationCode: string;
}) {
  await ensureSecurityAuthSchema();

  const codeHash = hashRegistrationCode(input.registrationCode.trim().toUpperCase());
  const scopeQuery =
    input.actor.role === "EMS"
      ? {
          text: `
            SELECT id, device_name
            FROM devices
            WHERE role_scope = 'EMS'
              AND team_id = $1
              AND is_active = TRUE
              AND is_lost = FALSE
              AND registration_required = TRUE
              AND registration_code_hash = $2
              AND registration_code_expires_at > NOW()
            LIMIT 1
          `,
          values: [input.actor.teamId, codeHash],
        }
      : {
          text: `
            SELECT id, device_name
            FROM devices
            WHERE role_scope = 'HOSPITAL'
              AND hospital_id = $1
              AND is_active = TRUE
              AND is_lost = FALSE
              AND registration_required = TRUE
              AND registration_code_hash = $2
              AND registration_code_expires_at > NOW()
            LIMIT 1
          `,
          values: [input.actor.hospitalId, codeHash],
        };

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const matched = await client.query<{ id: number; device_name: string }>(scopeQuery.text, scopeQuery.values);
    const row = matched.rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      return { ok: false as const, message: "登録コードが無効か、有効期限が切れています。" };
    }

    await client.query(
      `
        UPDATE devices
        SET
          registered_user_id = $2,
          registered_device_key = $3,
          registered_at = NOW(),
          registration_code_hash = NULL,
          registration_code_expires_at = NULL,
          updated_at = NOW(),
          last_seen_at = NOW()
        WHERE id = $1
      `,
      [row.id, input.actor.id, input.deviceKey],
    );

    await writeAuditLog(
      {
        actor: input.actor,
        action: "security.device.register",
        targetType: "device",
        targetId: String(row.id),
        metadata: { deviceKey: input.deviceKey },
      },
      client,
    );

    await client.query("COMMIT");
    return { ok: true as const, deviceName: row.device_name };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function isLoginLocked(username: string) {
  await ensureSecurityAuthSchema();
  const result = await db.query<{ locked_until: Date | string | null }>(
    `
      SELECT locked_until
      FROM users
      WHERE username = $1
      LIMIT 1
    `,
    [username],
  );
  const lockedUntil = result.rows[0]?.locked_until ? new Date(result.rows[0].locked_until) : null;
  return lockedUntil && lockedUntil.getTime() > Date.now() ? lockedUntil : null;
}

export async function recordFailedLoginAttempt(username: string, request?: Request, reason = "invalid_credentials") {
  await ensureSecurityAuthSchema();
  const ipHash = hashIp(resolveClientIp(request));

  await db.query(
    `
      INSERT INTO login_attempts (username, ip_hash_or_ip, attempted_at, success, failure_reason)
      VALUES ($1, $2, NOW(), FALSE, $3)
    `,
    [username, ipHash, reason],
  );

  const failureCount = await db.query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM login_attempts
      WHERE username = $1
        AND success = FALSE
        AND attempted_at >= NOW() - ($2::text || ' minutes')::interval
    `,
    [username, String(LOGIN_WINDOW_MINUTES)],
  );

  const failures = Number(failureCount.rows[0]?.count ?? "0");
  await recordSecuritySignalEvent({
    source: "auth.login",
    message:
      failures >= LOGIN_FAILURE_LIMIT
        ? "ログイン失敗がロックしきい値に到達しました。"
        : "ログイン失敗を検知しました。",
    severity: failures >= LOGIN_FAILURE_LIMIT ? "error" : "warning",
    metadata: {
      signalType: "login_failed",
      usernameHash: hashMonitorValue(username),
      reason,
      failuresInWindow: failures,
      windowMinutes: LOGIN_WINDOW_MINUTES,
      lockThreshold: LOGIN_FAILURE_LIMIT,
    },
  }).catch(() => undefined);
  if (failures < LOGIN_FAILURE_LIMIT) return null;

  const lockedUntil = new Date(Date.now() + LOGIN_LOCK_MINUTES * 60 * 1000);
  await db.query(
    `
      UPDATE users
      SET locked_until = $2, updated_at = NOW()
      WHERE username = $1
    `,
    [username, lockedUntil.toISOString()],
  );

  return lockedUntil;
}

export async function recordSuccessfulLoginAttempt(userId: number, username: string, request?: Request) {
  await ensureSecurityAuthSchema();
  const ipHash = hashIp(resolveClientIp(request));

  await db.query(
    `
      INSERT INTO login_attempts (username, ip_hash_or_ip, attempted_at, success, failure_reason)
      VALUES ($1, $2, NOW(), TRUE, NULL)
    `,
    [username, ipHash],
  );

  await db.query(
    `
      UPDATE users
      SET locked_until = NULL, last_login_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `,
    [userId],
  );
}

export async function getSecurityUserById(userId: number) {
  await ensureSecurityAuthSchema();
  const result = await db.query<{
    id: number;
    role: string;
    username: string;
    display_name: string;
    team_id: number | null;
    hospital_id: number | null;
    session_version: number;
    is_active: boolean;
    must_change_password: boolean;
    temporary_password_expires_at: Date | string | null;
  }>(
    `
      SELECT id, role, username, display_name, team_id, hospital_id, session_version, is_active, must_change_password, temporary_password_expires_at
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId],
  );

  return result.rows[0] ?? null;
}

export async function bumpUserSessionVersion(client: PoolClient, userId: number) {
  await client.query(
    `
      UPDATE users
      SET session_version = session_version + 1, updated_at = NOW()
      WHERE id = $1
    `,
    [userId],
  );
}

function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = randomBytes(12);
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
}

export async function unlockUserLoginLock(input: { userId: number; actor: AuthenticatedUser }) {
  await ensureSecurityAuthSchema();
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const current = await client.query<{ username: string; locked_until: Date | string | null }>(
      `
        SELECT username, locked_until
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [input.userId],
    );
    const row = current.rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query(
      `
        UPDATE users
        SET locked_until = NULL, updated_at = NOW()
        WHERE id = $1
      `,
      [input.userId],
    );

    await writeAuditLog(
      {
        actor: input.actor,
        action: "security.login.unlock",
        targetType: "user",
        targetId: String(input.userId),
        before: { lockedUntil: toIsoString(row.locked_until) },
        after: { lockedUntil: null },
      },
      client,
    );

    await client.query("COMMIT");
    await clearLoginRateLimitForUsername(row.username).catch(() => undefined);
    return { username: row.username };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function issueTemporaryPasswordForUser(input: { userId: number; actor: AuthenticatedUser }) {
  await ensureSecurityAuthSchema();
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hash(temporaryPassword, 12);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const current = await client.query<{ username: string }>(
      `
        SELECT username
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [input.userId],
    );
    const row = current.rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query(
      `
        UPDATE users
        SET
          password_hash = $2,
          must_change_password = TRUE,
          temporary_password_expires_at = $3,
          updated_at = NOW()
        WHERE id = $1
      `,
      [input.userId, passwordHash, expiresAt.toISOString()],
    );

    await bumpUserSessionVersion(client, input.userId);

    await writeAuditLog(
      {
        actor: input.actor,
        action: "security.password.issueTemporary",
        targetType: "user",
        targetId: String(input.userId),
        after: { mustChangePassword: true, temporaryPasswordExpiresAt: expiresAt.toISOString() },
      },
      client,
    );

    await client.query("COMMIT");
    return {
      username: row.username,
      temporaryPassword,
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function changePasswordForAuthenticatedUser(input: {
  userId: number;
  currentPassword: string;
  newPassword: string;
  actor: AuthenticatedUser;
}) {
  await ensureSecurityAuthSchema();
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const current = await client.query<{
      password_hash: string;
      must_change_password: boolean;
      temporary_password_expires_at: Date | string | null;
    }>(
      `
        SELECT password_hash, must_change_password, temporary_password_expires_at
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [input.userId],
    );
    const row = current.rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      return { ok: false as const, message: "User not found." };
    }

    const currentMatches = await compare(input.currentPassword, row.password_hash);
    if (!currentMatches) {
      await client.query("ROLLBACK");
      return { ok: false as const, message: "現在のパスワードが正しくありません。" };
    }

    const nextHash = await hash(input.newPassword, 12);
    await client.query(
      `
        UPDATE users
        SET
          password_hash = $2,
          must_change_password = FALSE,
          temporary_password_expires_at = NULL,
          password_changed_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
      `,
      [input.userId, nextHash],
    );
    await bumpUserSessionVersion(client, input.userId);

    await writeAuditLog(
      {
        actor: input.actor,
        action: "security.password.change",
        targetType: "user",
        targetId: String(input.userId),
        before: {
          mustChangePassword: row.must_change_password,
          temporaryPasswordExpiresAt: toIsoString(row.temporary_password_expires_at),
        },
        after: {
          mustChangePassword: false,
          temporaryPasswordExpiresAt: null,
        },
      },
      client,
    );

    await client.query("COMMIT");
    return { ok: true as const };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
