import type { AuthenticatedUser } from "@/lib/authContext";
import { db } from "@/lib/db";

export function isCaseReader(user: AuthenticatedUser | null): user is AuthenticatedUser {
  return user?.role === "EMS" || user?.role === "ADMIN";
}

export function canReadAllCases(user: AuthenticatedUser | null): boolean {
  return user?.role === "ADMIN";
}

export function canReadCaseTeam(user: AuthenticatedUser | null, caseTeamId: number | null): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return user.role === "EMS" && user.teamId != null && caseTeamId != null && user.teamId === caseTeamId;
}

export function canEditCaseTeam(user: AuthenticatedUser | null, caseTeamId: number | null): boolean {
  return user?.role === "EMS" && user.teamId != null && caseTeamId != null && user.teamId === caseTeamId;
}

export type CaseTargetAccessContext = {
  targetId: number;
  status: string;
  hospitalId: number;
  requestId: string;
  caseId: string;
  caseTeamId: number | null;
};

export async function getCaseTargetAccessContextByTargetId(targetId: number): Promise<CaseTargetAccessContext | null> {
  const result = await db.query<{
    id: number;
    status: string;
    hospital_id: number;
    request_id: string;
    case_id: string;
    case_team_id: number | null;
  }>(
    `
      SELECT
        t.id,
        t.status,
        t.hospital_id,
        r.request_id,
        r.case_id,
        c.team_id AS case_team_id
      FROM hospital_request_targets t
      JOIN hospital_requests r ON r.id = t.hospital_request_id
      JOIN cases c ON c.case_id = r.case_id
      WHERE t.id = $1
      LIMIT 1
    `,
    [targetId],
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    targetId: row.id,
    status: row.status,
    hospitalId: row.hospital_id,
    requestId: row.request_id,
    caseId: row.case_id,
    caseTeamId: row.case_team_id,
  };
}

export async function getCaseTargetAccessContext(
  caseId: string,
  targetId: number,
): Promise<CaseTargetAccessContext | null> {
  const result = await db.query<{
    id: number;
    status: string;
    hospital_id: number;
    request_id: string;
    case_id: string;
    case_team_id: number | null;
  }>(
    `
      SELECT
        t.id,
        t.status,
        t.hospital_id,
        r.request_id,
        r.case_id,
        c.team_id AS case_team_id
      FROM hospital_request_targets t
      JOIN hospital_requests r ON r.id = t.hospital_request_id
      JOIN cases c ON c.case_id = r.case_id
      WHERE r.case_id = $1
        AND t.id = $2
      LIMIT 1
    `,
    [caseId, targetId],
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    targetId: row.id,
    status: row.status,
    hospitalId: row.hospital_id,
    requestId: row.request_id,
    caseId: row.case_id,
    caseTeamId: row.case_team_id,
  };
}
