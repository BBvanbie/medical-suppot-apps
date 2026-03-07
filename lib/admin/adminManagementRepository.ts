import type { PoolClient } from "pg";

import type { AuthenticatedUser } from "@/lib/authContext";
import {
  type AdminAmbulanceTeamCreateInput,
  type AdminAmbulanceTeamUpdateInput,
  type AdminHospitalCreateInput,
  type AdminHospitalUpdateInput,
  type AdminUserUpdateInput,
} from "@/lib/admin/adminManagementValidation";
import { db } from "@/lib/db";

export type AdminHospitalRow = {
  id: number;
  sourceNo: number;
  name: string;
  municipality: string;
  postalCode: string;
  address: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
};

export type AdminAmbulanceTeamRow = {
  id: number;
  teamCode: string;
  teamName: string;
  division: string;
  isActive: boolean;
  createdAt: string;
};

export type AdminAuditLogRow = {
  id: number;
  action: string;
  actorRole: string;
  targetType?: string;
  targetId?: string;
  createdAt: string;
  beforeJson: Record<string, unknown> | null;
  afterJson: Record<string, unknown> | null;
};

export type AdminUserRow = {
  id: number;
  username: string;
  displayName: string;
  role: "EMS" | "HOSPITAL" | "ADMIN";
  teamId: number | null;
  teamName: string;
  hospitalId: number | null;
  hospitalName: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

export type AdminUserOption = {
  id: number;
  label: string;
};

export type AdminOrgRow = {
  type: "hospital" | "ambulance_team";
  id: number;
  code: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
};

type AuditLogPayload = {
  actor: AuthenticatedUser;
  action: string;
  targetType: string;
  targetId: string;
  beforeJson?: Record<string, unknown> | null;
  afterJson?: Record<string, unknown> | null;
};

type HospitalDbRow = {
  id: number;
  source_no: number;
  name: string;
  municipality: string | null;
  postal_code: string | null;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: Date | string;
};

type AmbulanceTeamDbRow = {
  id: number;
  team_code: string;
  team_name: string;
  division: string;
  is_active: boolean;
  created_at: Date | string;
};

type AdminUserDbRow = {
  id: number;
  username: string;
  display_name: string;
  role: "EMS" | "HOSPITAL" | "ADMIN";
  team_id: number | null;
  team_name: string | null;
  hospital_id: number | null;
  hospital_name: string | null;
  is_active: boolean;
  last_login_at: Date | string | null;
  created_at: Date | string;
};

type AdminOrgDbRow = {
  type: "hospital" | "ambulance_team";
  id: number;
  code: string;
  name: string;
  display_order: number;
  is_active: boolean;
};

function formatTimestamp(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function mapHospitalRow(row: HospitalDbRow): AdminHospitalRow {
  return {
    id: row.id,
    sourceNo: row.source_no,
    name: row.name,
    municipality: row.municipality ?? "",
    postalCode: row.postal_code ?? "",
    address: row.address ?? "",
    phone: row.phone ?? "",
    isActive: row.is_active,
    createdAt: formatTimestamp(row.created_at),
  };
}

function mapAmbulanceTeamRow(row: AmbulanceTeamDbRow): AdminAmbulanceTeamRow {
  return {
    id: row.id,
    teamCode: row.team_code,
    teamName: row.team_name,
    division: row.division,
    isActive: row.is_active,
    createdAt: formatTimestamp(row.created_at),
  };
}

function mapUserRow(row: AdminUserDbRow): AdminUserRow {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    teamId: row.team_id,
    teamName: row.team_name ?? "",
    hospitalId: row.hospital_id,
    hospitalName: row.hospital_name ?? "",
    isActive: row.is_active,
    lastLoginAt: row.last_login_at ? formatTimestamp(row.last_login_at) : null,
    createdAt: formatTimestamp(row.created_at),
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
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
    `,
    [
      payload.actor.id,
      payload.actor.role,
      payload.action,
      payload.targetType,
      payload.targetId,
      payload.beforeJson ? JSON.stringify(payload.beforeJson) : null,
      payload.afterJson ? JSON.stringify(payload.afterJson) : null,
    ],
  );
}

async function getHospitalById(client: PoolClient, id: number) {
  const result = await client.query<HospitalDbRow>(
    `
      SELECT id, source_no, name, municipality, postal_code, address, phone, is_active, created_at
      FROM hospitals
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );
  return result.rows[0] ?? null;
}

async function getAmbulanceTeamById(client: PoolClient, id: number) {
  const result = await client.query<AmbulanceTeamDbRow>(
    `
      SELECT id, team_code, team_name, division, is_active, created_at
      FROM emergency_teams
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function listAdminHospitals(): Promise<AdminHospitalRow[]> {
  const result = await db.query<HospitalDbRow>(`
    SELECT id, source_no, name, municipality, postal_code, address, phone, is_active, created_at
    FROM hospitals
    ORDER BY created_at DESC, id DESC
  `);

  return result.rows.map(mapHospitalRow);
}

export async function listAdminAmbulanceTeams(): Promise<AdminAmbulanceTeamRow[]> {
  const result = await db.query<AmbulanceTeamDbRow>(`
    SELECT id, team_code, team_name, division, is_active, created_at
    FROM emergency_teams
    ORDER BY created_at DESC, id DESC
  `);

  return result.rows.map(mapAmbulanceTeamRow);
}

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  const result = await db.query<AdminUserDbRow>(`
    SELECT
      u.id,
      u.username,
      u.display_name,
      u.role,
      u.team_id,
      et.team_name,
      u.hospital_id,
      h.name AS hospital_name,
      u.is_active,
      u.last_login_at,
      u.created_at
    FROM users u
    LEFT JOIN emergency_teams et ON et.id = u.team_id
    LEFT JOIN hospitals h ON h.id = u.hospital_id
    ORDER BY u.created_at DESC, u.id DESC
  `);

  return result.rows.map(mapUserRow);
}

export async function listAdminTeamOptions(): Promise<AdminUserOption[]> {
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

export async function listAdminHospitalOptions(): Promise<AdminUserOption[]> {
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

export async function listAdminOrgs(): Promise<AdminOrgRow[]> {
  const result = await db.query<AdminOrgDbRow>(`
    SELECT
      'hospital'::text AS type,
      id,
      CAST(source_no AS TEXT) AS code,
      name,
      display_order,
      is_active
    FROM hospitals
    UNION ALL
    SELECT
      'ambulance_team'::text AS type,
      id,
      team_code AS code,
      team_name AS name,
      display_order,
      is_active
    FROM emergency_teams
    ORDER BY display_order ASC, name ASC, id ASC
  `);

  return result.rows.map((row) => ({
    type: row.type,
    id: row.id,
    code: row.code,
    name: row.name,
    displayOrder: row.display_order,
    isActive: row.is_active,
  }));
}

export async function createAdminHospital(input: AdminHospitalCreateInput, actor: AuthenticatedUser): Promise<AdminHospitalRow | null> {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const duplicate = await client.query<{ id: number }>("SELECT id FROM hospitals WHERE source_no = $1 LIMIT 1", [input.sourceNo]);
    if (duplicate.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }

    const inserted = await client.query<HospitalDbRow>(
      `
        INSERT INTO hospitals (source_no, municipality, name, postal_code, address, phone, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, TRUE)
        RETURNING id, source_no, name, municipality, postal_code, address, phone, is_active, created_at
      `,
      [input.sourceNo, input.municipality || "", input.name, input.postalCode || null, input.address || "", input.phone || null],
    );

    const row = inserted.rows[0];
    await createAuditLog(client, {
      actor,
      action: "admin.hospitals.create",
      targetType: "hospital",
      targetId: String(row.id),
      afterJson: {
        sourceNo: row.source_no,
        name: row.name,
        municipality: row.municipality ?? "",
        postalCode: row.postal_code ?? "",
        address: row.address ?? "",
        phone: row.phone ?? "",
        isActive: row.is_active,
      },
    });

    await client.query("COMMIT");
    return mapHospitalRow(row);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createAdminAmbulanceTeam(
  input: AdminAmbulanceTeamCreateInput,
  actor: AuthenticatedUser,
): Promise<AdminAmbulanceTeamRow | null> {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const duplicate = await client.query<{ id: number }>("SELECT id FROM emergency_teams WHERE team_code = $1 LIMIT 1", [input.teamCode]);
    if (duplicate.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }

    const inserted = await client.query<AmbulanceTeamDbRow>(
      `
        INSERT INTO emergency_teams (team_code, team_name, division, is_active)
        VALUES ($1, $2, $3, TRUE)
        RETURNING id, team_code, team_name, division, is_active, created_at
      `,
      [input.teamCode, input.teamName, input.division],
    );

    const row = inserted.rows[0];
    await createAuditLog(client, {
      actor,
      action: "admin.ambulanceTeams.create",
      targetType: "ambulance_team",
      targetId: String(row.id),
      afterJson: {
        teamCode: row.team_code,
        teamName: row.team_name,
        division: row.division,
        isActive: row.is_active,
      },
    });

    await client.query("COMMIT");
    return mapAmbulanceTeamRow(row);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateAdminHospital(id: number, input: AdminHospitalUpdateInput, actor: AuthenticatedUser): Promise<AdminHospitalRow | null> {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const current = await getHospitalById(client, id);
    if (!current) {
      await client.query("ROLLBACK");
      return null;
    }

    const updated = await client.query<HospitalDbRow>(
      `
        UPDATE hospitals
        SET
          name = $2,
          municipality = $3,
          postal_code = $4,
          address = $5,
          phone = $6,
          is_active = $7
        WHERE id = $1
        RETURNING id, source_no, name, municipality, postal_code, address, phone, is_active, created_at
      `,
      [id, input.name, input.municipality, input.postalCode || null, input.address, input.phone || null, input.isActive],
    );

    const row = updated.rows[0];
    const action =
      current.is_active !== row.is_active &&
      current.name === row.name &&
      (current.municipality ?? "") === (row.municipality ?? "") &&
      (current.postal_code ?? "") === (row.postal_code ?? "") &&
      (current.address ?? "") === (row.address ?? "") &&
      (current.phone ?? "") === (row.phone ?? "")
        ? "admin.hospitals.toggleActive"
        : "admin.hospitals.update";

    await createAuditLog(client, {
      actor,
      action,
      targetType: "hospital",
      targetId: String(row.id),
      beforeJson: mapHospitalRow(current),
      afterJson: mapHospitalRow(row),
    });

    await client.query("COMMIT");
    return mapHospitalRow(row);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateAdminAmbulanceTeam(
  id: number,
  input: AdminAmbulanceTeamUpdateInput,
  actor: AuthenticatedUser,
): Promise<AdminAmbulanceTeamRow | null> {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const current = await getAmbulanceTeamById(client, id);
    if (!current) {
      await client.query("ROLLBACK");
      return null;
    }

    const updated = await client.query<AmbulanceTeamDbRow>(
      `
        UPDATE emergency_teams
        SET
          team_name = $2,
          division = $3,
          is_active = $4
        WHERE id = $1
        RETURNING id, team_code, team_name, division, is_active, created_at
      `,
      [id, input.teamName, input.division, input.isActive],
    );

    const row = updated.rows[0];
    const action =
      current.is_active !== row.is_active && current.team_name === row.team_name && current.division === row.division
        ? "admin.ambulanceTeams.toggleActive"
        : "admin.ambulanceTeams.update";

    await createAuditLog(client, {
      actor,
      action,
      targetType: "ambulance_team",
      targetId: String(row.id),
      beforeJson: mapAmbulanceTeamRow(current),
      afterJson: mapAmbulanceTeamRow(row),
    });

    await client.query("COMMIT");
    return mapAmbulanceTeamRow(row);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listAdminAuditLogs(targetType: "hospital" | "ambulance_team" | "user", targetId: number): Promise<AdminAuditLogRow[]> {
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
      WHERE target_type = $1
        AND target_id = $2
      ORDER BY created_at DESC, id DESC
      LIMIT 12
    `,
    [targetType, String(targetId)],
  );

  return result.rows.map((row) => ({
    id: row.id,
    action: row.action,
    actorRole: row.actor_role,
    createdAt: formatTimestamp(row.created_at),
    beforeJson: row.before_json,
    afterJson: row.after_json,
  }));
}

export async function listGlobalAdminAuditLogs(filters?: {
  targetType?: string;
  action?: string;
  query?: string;
}): Promise<AdminAuditLogRow[]> {
  const clauses: string[] = [];
  const values: unknown[] = [];

  if (filters?.targetType) {
    values.push(filters.targetType);
    clauses.push(`target_type = $${values.length}`);
  }

  if (filters?.action) {
    values.push(filters.action);
    clauses.push(`action = $${values.length}`);
  }

  if (filters?.query) {
    values.push(`%${filters.query}%`);
    clauses.push(`(target_id ILIKE $${values.length} OR action ILIKE $${values.length} OR actor_role ILIKE $${values.length})`);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await db.query<{
    id: number;
    action: string;
    actor_role: string;
    target_type: string;
    target_id: string;
    created_at: Date | string;
    before_json: Record<string, unknown> | null;
    after_json: Record<string, unknown> | null;
  }>(
    `
      SELECT id, action, actor_role, target_type, target_id, created_at, before_json, after_json
      FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC, id DESC
      LIMIT 200
    `,
    values,
  );

  return result.rows.map((row) => ({
    id: row.id,
    action: row.action,
    actorRole: row.actor_role,
    targetType: row.target_type,
    targetId: row.target_id,
    createdAt: formatTimestamp(row.created_at),
    beforeJson: row.before_json,
    afterJson: row.after_json,
  }));
}

export async function updateAdminUser(id: number, input: AdminUserUpdateInput, actor: AuthenticatedUser): Promise<AdminUserRow | null> {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const currentResult = await client.query<AdminUserDbRow>(
      `
        SELECT
          u.id,
          u.username,
          u.display_name,
          u.role,
          u.team_id,
          et.team_name,
          u.hospital_id,
          h.name AS hospital_name,
          u.is_active,
          u.last_login_at,
          u.created_at
        FROM users u
        LEFT JOIN emergency_teams et ON et.id = u.team_id
        LEFT JOIN hospitals h ON h.id = u.hospital_id
        WHERE u.id = $1
        LIMIT 1
      `,
      [id],
    );
    const current = currentResult.rows[0];
    if (!current) {
      await client.query("ROLLBACK");
      return null;
    }

    const updatedResult = await client.query<AdminUserDbRow>(
      `
        UPDATE users
        SET
          display_name = $2,
          role = $3,
          team_id = $4,
          hospital_id = $5,
          is_active = $6,
          updated_at = NOW()
        WHERE id = $1
        RETURNING id, username, display_name, role, team_id, hospital_id, is_active, last_login_at, created_at
      `,
      [id, input.displayName, input.role, input.teamId, input.hospitalId, input.isActive],
    );

    const updatedBase = updatedResult.rows[0];
    const relatedResult = await client.query<AdminUserDbRow>(
      `
        SELECT
          u.id,
          u.username,
          u.display_name,
          u.role,
          u.team_id,
          et.team_name,
          u.hospital_id,
          h.name AS hospital_name,
          u.is_active,
          u.last_login_at,
          u.created_at
        FROM users u
        LEFT JOIN emergency_teams et ON et.id = u.team_id
        LEFT JOIN hospitals h ON h.id = u.hospital_id
        WHERE u.id = $1
        LIMIT 1
      `,
      [updatedBase.id],
    );
    const updated = relatedResult.rows[0];

    const action =
      current.is_active !== updated.is_active &&
      current.display_name === updated.display_name &&
      current.role === updated.role &&
      current.team_id === updated.team_id &&
      current.hospital_id === updated.hospital_id
        ? "admin.users.toggleActive"
        : current.role !== updated.role
          ? "admin.users.changeRole"
          : "admin.users.update";

    await createAuditLog(client, {
      actor,
      action,
      targetType: "user",
      targetId: String(updated.id),
      beforeJson: mapUserRow(current),
      afterJson: mapUserRow(updated),
    });

    await client.query("COMMIT");
    return mapUserRow(updated);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateAdminOrg(
  targetType: "hospital" | "ambulance_team",
  id: number,
  input: { displayOrder: number; isActive: boolean },
  actor: AuthenticatedUser,
): Promise<AdminOrgRow | null> {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const currentResult =
      targetType === "hospital"
        ? await client.query<{ id: number; source_no: number; name: string; display_order: number; is_active: boolean }>(
            `
              SELECT id, source_no, name, display_order, is_active
              FROM hospitals
              WHERE id = $1
              LIMIT 1
            `,
            [id],
          )
        : await client.query<{ id: number; team_code: string; team_name: string; display_order: number; is_active: boolean }>(
            `
              SELECT id, team_code, team_name, display_order, is_active
              FROM emergency_teams
              WHERE id = $1
              LIMIT 1
            `,
            [id],
          );

    const current = currentResult.rows[0];
    if (!current) {
      await client.query("ROLLBACK");
      return null;
    }

    const updatedResult =
      targetType === "hospital"
        ? await client.query<{ id: number; source_no: number; name: string; display_order: number; is_active: boolean }>(
            `
              UPDATE hospitals
              SET display_order = $2, is_active = $3
              WHERE id = $1
              RETURNING id, source_no, name, display_order, is_active
            `,
            [id, input.displayOrder, input.isActive],
          )
        : await client.query<{ id: number; team_code: string; team_name: string; display_order: number; is_active: boolean }>(
            `
              UPDATE emergency_teams
              SET display_order = $2, is_active = $3
              WHERE id = $1
              RETURNING id, team_code, team_name, display_order, is_active
            `,
            [id, input.displayOrder, input.isActive],
          );

    const updated = updatedResult.rows[0];
    let beforeJson: Record<string, unknown>;
    let afterJson: Record<string, unknown>;

    if (targetType === "hospital") {
      const currentHospital = current as { id: number; source_no: number; name: string; display_order: number; is_active: boolean };
      const updatedHospital = updated as { id: number; source_no: number; name: string; display_order: number; is_active: boolean };
      beforeJson = {
        type: "hospital",
        id: currentHospital.id,
        code: String(currentHospital.source_no),
        name: currentHospital.name,
        displayOrder: currentHospital.display_order,
        isActive: currentHospital.is_active,
      };
      afterJson = {
        type: "hospital",
        id: updatedHospital.id,
        code: String(updatedHospital.source_no),
        name: updatedHospital.name,
        displayOrder: updatedHospital.display_order,
        isActive: updatedHospital.is_active,
      };
    } else {
      const currentTeam = current as { id: number; team_code: string; team_name: string; display_order: number; is_active: boolean };
      const updatedTeam = updated as { id: number; team_code: string; team_name: string; display_order: number; is_active: boolean };
      beforeJson = {
        type: "ambulance_team",
        id: currentTeam.id,
        code: currentTeam.team_code,
        name: currentTeam.team_name,
        displayOrder: currentTeam.display_order,
        isActive: currentTeam.is_active,
      };
      afterJson = {
        type: "ambulance_team",
        id: updatedTeam.id,
        code: updatedTeam.team_code,
        name: updatedTeam.team_name,
        displayOrder: updatedTeam.display_order,
        isActive: updatedTeam.is_active,
      };
    }

    await createAuditLog(client, {
      actor,
      action: current.is_active !== updated.is_active ? "admin.orgs.toggleActive" : "admin.orgs.update",
      targetType,
      targetId: String(updated.id),
      beforeJson,
      afterJson,
    });

    await client.query("COMMIT");

    return {
      type: targetType,
      id: updated.id,
      code: String(afterJson.code),
      name: String(afterJson.name),
      displayOrder: updated.display_order,
      isActive: updated.is_active,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
