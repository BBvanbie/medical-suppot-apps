import type { PoolClient } from "pg";

import type { AuthenticatedUser } from "@/lib/authContext";
import { db } from "@/lib/db";
import type { AdminAuditLogRow, AdminUserOption } from "@/lib/admin/adminManagementRepository";
import type { AdminDeviceUpdateInput } from "@/lib/admin/adminDevicesValidation";
import { issueDeviceRegistrationCode } from "@/lib/securityAuthRepository";

export type AdminDeviceRow = {
  id: number;
  deviceCode: string;
  deviceName: string;
  roleScope: "EMS" | "HOSPITAL";
  teamId: number | null;
  teamName: string;
  hospitalId: number | null;
  hospitalName: string;
  isActive: boolean;
  isLost: boolean;
  lastSeenAt: string | null;
  registrationRequired: boolean;
  registrationCodeExpiresAt: string | null;
  registeredAt: string | null;
  registeredUsername: string;
  createdAt: string;
};

type DeviceDbRow = {
  id: number;
  device_code: string;
  device_name: string;
  role_scope: "EMS" | "HOSPITAL";
  team_id: number | null;
  team_name: string | null;
  hospital_id: number | null;
  hospital_name: string | null;
  is_active: boolean;
  is_lost: boolean;
  last_seen_at: Date | string | null;
  registration_required: boolean;
  registration_code_expires_at: Date | string | null;
  registered_at: Date | string | null;
  registered_username: string | null;
  created_at: Date | string;
};

type AuditLogPayload = {
  actor: AuthenticatedUser;
  action: string;
  targetId: string;
  beforeJson?: Record<string, unknown> | null;
  afterJson?: Record<string, unknown> | null;
};

function formatTimestamp(value: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function mapDeviceRow(row: DeviceDbRow): AdminDeviceRow {
  return {
    id: row.id,
    deviceCode: row.device_code,
    deviceName: row.device_name,
    roleScope: row.role_scope,
    teamId: row.team_id,
    teamName: row.team_name ?? "",
    hospitalId: row.hospital_id,
    hospitalName: row.hospital_name ?? "",
    isActive: row.is_active,
    isLost: row.is_lost,
    lastSeenAt: formatTimestamp(row.last_seen_at),
    registrationRequired: row.registration_required,
    registrationCodeExpiresAt: formatTimestamp(row.registration_code_expires_at),
    registeredAt: formatTimestamp(row.registered_at),
    registeredUsername: row.registered_username ?? "",
    createdAt: formatTimestamp(row.created_at) ?? "-",
  };
}

async function createAuditLog(client: PoolClient, payload: AuditLogPayload) {
  await client.query(
    `
      INSERT INTO audit_logs (
        actor_user_id,
        actor_role,
        action,
        target_type,
        target_id,
        before_json,
        after_json
      ) VALUES ($1, $2, $3, 'device', $4, $5::jsonb, $6::jsonb)
    `,
    [
      payload.actor.id,
      payload.actor.role,
      payload.action,
      payload.targetId,
      payload.beforeJson ? JSON.stringify(payload.beforeJson) : null,
      payload.afterJson ? JSON.stringify(payload.afterJson) : null,
    ],
  );
}

export async function ensureDefaultAdminDevicesSeeded() {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const firstTeam = await client.query<{ id: number }>(`
      SELECT id
      FROM emergency_teams
      ORDER BY id ASC
      LIMIT 1
    `);
    if (firstTeam.rows[0]) {
      await client.query(
        `
          INSERT INTO devices (device_code, device_name, role_scope, team_id, hospital_id, is_active, is_lost, last_seen_at)
          VALUES ('EMS-IPAD-001', 'EMS iPad', 'EMS', $1, NULL, TRUE, FALSE, NOW())
          ON CONFLICT (device_code) DO NOTHING
        `,
        [firstTeam.rows[0].id],
      );
    }

    const firstHospital = await client.query<{ id: number }>(`
      SELECT id
      FROM hospitals
      ORDER BY id ASC
      LIMIT 1
    `);
    if (firstHospital.rows[0]) {
      await client.query(
        `
          INSERT INTO devices (device_code, device_name, role_scope, team_id, hospital_id, is_active, is_lost, last_seen_at)
          VALUES ('HP-TERM-001', '病院受付PC', 'HOSPITAL', NULL, $1, TRUE, FALSE, NOW())
          ON CONFLICT (device_code) DO NOTHING
        `,
        [firstHospital.rows[0].id],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listAdminDevices(): Promise<AdminDeviceRow[]> {
  const result = await db.query<DeviceDbRow>(`
    SELECT
      d.id,
      d.device_code,
      d.device_name,
      d.role_scope,
      d.team_id,
      et.team_name,
      d.hospital_id,
      h.name AS hospital_name,
      d.is_active,
      d.is_lost,
      d.last_seen_at,
      d.registration_required,
      d.registration_code_expires_at,
      d.registered_at,
      bound_user.username AS registered_username,
      d.created_at
    FROM devices d
    LEFT JOIN emergency_teams et ON et.id = d.team_id
    LEFT JOIN hospitals h ON h.id = d.hospital_id
    LEFT JOIN users bound_user ON bound_user.id = d.registered_user_id
    ORDER BY d.created_at DESC, d.id DESC
  `);

  return result.rows.map(mapDeviceRow);
}

async function getDeviceById(client: PoolClient, id: number) {
  const result = await client.query<DeviceDbRow>(
    `
      SELECT
        d.id,
        d.device_code,
        d.device_name,
        d.role_scope,
        d.team_id,
        et.team_name,
        d.hospital_id,
        h.name AS hospital_name,
        d.is_active,
        d.is_lost,
        d.last_seen_at,
        d.registration_required,
        d.registration_code_expires_at,
        d.registered_at,
        bound_user.username AS registered_username,
        d.created_at
      FROM devices d
      LEFT JOIN emergency_teams et ON et.id = d.team_id
      LEFT JOIN hospitals h ON h.id = d.hospital_id
      LEFT JOIN users bound_user ON bound_user.id = d.registered_user_id
      WHERE d.id = $1
      LIMIT 1
    `,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function updateAdminDevice(id: number, input: AdminDeviceUpdateInput, actor: AuthenticatedUser): Promise<AdminDeviceRow | null> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const current = await getDeviceById(client, id);
    if (!current) {
      await client.query("ROLLBACK");
      return null;
    }

    const updatedBase = await client.query<{ id: number }>(
      `
        UPDATE devices
        SET
          device_name = $2,
          role_scope = $3,
          team_id = $4,
          hospital_id = $5,
          is_active = $6,
          is_lost = $7,
          updated_at = NOW()
        WHERE id = $1
        RETURNING id
      `,
      [id, input.deviceName, input.roleScope, input.teamId, input.hospitalId, input.isActive, input.isLost],
    );

    const updated = await getDeviceById(client, updatedBase.rows[0].id);
    if (!updated) {
      await client.query("ROLLBACK");
      return null;
    }

    const action =
      current.is_active !== updated.is_active &&
      current.device_name === updated.device_name &&
      current.role_scope === updated.role_scope &&
      current.team_id === updated.team_id &&
      current.hospital_id === updated.hospital_id &&
      current.is_lost === updated.is_lost
        ? "admin.devices.revoke"
        : "admin.devices.update";

    await createAuditLog(client, {
      actor,
      action,
      targetId: String(updated.id),
      beforeJson: mapDeviceRow(current),
      afterJson: mapDeviceRow(updated),
    });

    await client.query("COMMIT");
    return mapDeviceRow(updated);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listAdminDeviceLogs(targetId: number): Promise<AdminAuditLogRow[]> {
  const result = await db.query<{
    id: number;
    action: string;
    actor_role: string;
    created_at: Date | string;
    before_json: Record<string, unknown> | null;
    after_json: Record<string, unknown> | null;
  }>(
    `
      SELECT id, action, actor_role, created_at, before_json, after_json
      FROM audit_logs
      WHERE target_type = 'device'
        AND target_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT 12
    `,
    [String(targetId)],
  );

  return result.rows.map((row) => ({
    id: row.id,
    action: row.action,
    actorRole: row.actor_role,
    createdAt: formatTimestamp(row.created_at) ?? "-",
    beforeJson: row.before_json,
    afterJson: row.after_json,
  }));
}

export async function listAdminDeviceTeamOptions(): Promise<AdminUserOption[]> {
  const result = await db.query<{ id: number; team_name: string; team_code: string; is_active: boolean }>(`
    SELECT id, team_name, team_code, is_active
    FROM emergency_teams
    ORDER BY is_active DESC, team_name ASC, id ASC
  `);

  return result.rows.map((row) => ({
    id: row.id,
    label: `${row.team_name} (${row.team_code})${row.is_active ? "" : " [無効]"}`,
  }));
}

export async function listAdminDeviceHospitalOptions(): Promise<AdminUserOption[]> {
  const result = await db.query<{ id: number; name: string; source_no: number; is_active: boolean }>(`
    SELECT id, name, source_no, is_active
    FROM hospitals
    ORDER BY is_active DESC, name ASC, id ASC
  `);

  return result.rows.map((row) => ({
    id: row.id,
    label: `${row.name} (H-${row.source_no})${row.is_active ? "" : " [無効]"}`,
  }));
}

export async function issueAdminDeviceRegistrationCode(id: number, actor: AuthenticatedUser) {
  return issueDeviceRegistrationCode({
    deviceId: id,
    actor,
  });
}
