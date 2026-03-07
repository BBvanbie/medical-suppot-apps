import type { PoolClient } from "pg";

import type { AuthenticatedUser } from "@/lib/authContext";
import {
  type AdminAmbulanceTeamCreateInput,
  type AdminAmbulanceTeamUpdateInput,
  type AdminHospitalCreateInput,
  type AdminHospitalUpdateInput,
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
  createdAt: string;
  beforeJson: Record<string, unknown> | null;
  afterJson: Record<string, unknown> | null;
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

export async function listAdminAuditLogs(targetType: "hospital" | "ambulance_team", targetId: number): Promise<AdminAuditLogRow[]> {
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
