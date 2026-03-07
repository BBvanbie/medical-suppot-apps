import type { PoolClient } from "pg";

import { db } from "@/lib/db";
import type { AuthenticatedUser } from "@/lib/authContext";
import type { AdminAmbulanceTeamCreateInput, AdminHospitalCreateInput } from "@/lib/admin/adminManagementValidation";

export type AdminHospitalRow = {
  id: number;
  sourceNo: number;
  name: string;
  municipality: string;
  postalCode: string;
  address: string;
  phone: string;
  createdAt: string;
};

export type AdminAmbulanceTeamRow = {
  id: number;
  teamCode: string;
  teamName: string;
  division: string;
  createdAt: string;
};

type AuditLogPayload = {
  actor: AuthenticatedUser;
  action: string;
  targetType: string;
  targetId: string;
  beforeJson?: Record<string, unknown> | null;
  afterJson?: Record<string, unknown> | null;
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

export async function listAdminHospitals(): Promise<AdminHospitalRow[]> {
  const result = await db.query<{
    id: number;
    source_no: number;
    name: string;
    municipality: string | null;
    postal_code: string | null;
    address: string | null;
    phone: string | null;
    created_at: Date | string;
  }>(`
    SELECT id, source_no, name, municipality, postal_code, address, phone, created_at
    FROM hospitals
    ORDER BY created_at DESC, id DESC
  `);

  return result.rows.map((row) => ({
    id: row.id,
    sourceNo: row.source_no,
    name: row.name,
    municipality: row.municipality ?? "",
    postalCode: row.postal_code ?? "",
    address: row.address ?? "",
    phone: row.phone ?? "",
    createdAt: formatTimestamp(row.created_at),
  }));
}

export async function listAdminAmbulanceTeams(): Promise<AdminAmbulanceTeamRow[]> {
  const result = await db.query<{
    id: number;
    team_code: string;
    team_name: string;
    division: string;
    created_at: Date | string;
  }>(`
    SELECT id, team_code, team_name, division, created_at
    FROM emergency_teams
    ORDER BY created_at DESC, id DESC
  `);

  return result.rows.map((row) => ({
    id: row.id,
    teamCode: row.team_code,
    teamName: row.team_name,
    division: row.division,
    createdAt: formatTimestamp(row.created_at),
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

    const inserted = await client.query<{
      id: number;
      source_no: number;
      name: string;
      municipality: string | null;
      postal_code: string | null;
      address: string | null;
      phone: string | null;
      created_at: Date | string;
    }>(
      `
        INSERT INTO hospitals (source_no, municipality, name, postal_code, address, phone)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, source_no, name, municipality, postal_code, address, phone, created_at
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
      },
    });

    await client.query("COMMIT");

    return {
      id: row.id,
      sourceNo: row.source_no,
      name: row.name,
      municipality: row.municipality ?? "",
      postalCode: row.postal_code ?? "",
      address: row.address ?? "",
      phone: row.phone ?? "",
      createdAt: formatTimestamp(row.created_at),
    };
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

    const inserted = await client.query<{
      id: number;
      team_code: string;
      team_name: string;
      division: string;
      created_at: Date | string;
    }>(
      `
        INSERT INTO emergency_teams (team_code, team_name, division)
        VALUES ($1, $2, $3)
        RETURNING id, team_code, team_name, division, created_at
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
      },
    });

    await client.query("COMMIT");

    return {
      id: row.id,
      teamCode: row.team_code,
      teamName: row.team_name,
      division: row.division,
      createdAt: formatTimestamp(row.created_at),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
