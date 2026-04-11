import type { AuthenticatedUser } from "@/lib/authContext";
import { writeForbiddenAccessAudit } from "@/lib/auditLog";
import { db } from "@/lib/db";
import { recordSecuritySignalEvent } from "@/lib/systemMonitor";

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

export type CaseAccessContext = {
  caseId: string;
  caseUid: string;
  caseTeamId: number | null;
  mode: "LIVE" | "TRAINING";
};

export type CaseTargetAccessContext = {
  targetId: number;
  status: string;
  hospitalId: number;
  requestId: string;
  caseId: string;
  caseUid: string;
  caseTeamId: number | null;
  mode: "LIVE" | "TRAINING";
};

type AccessResult<T> =
  | { ok: true; context: T }
  | { ok: false; status: number; message: string };

async function auditForbiddenAccess(
  user: AuthenticatedUser | null,
  targetType: string,
  targetId: string,
  message: string,
  metadata?: unknown,
) {
  if (!user) return;
  await writeForbiddenAccessAudit({ actor: user, targetType, targetId, message, metadata }).catch(() => undefined);
  await recordSecuritySignalEvent({
    source: "authorization.forbidden_access",
    message,
    metadata: {
      signalType: "forbidden_access",
      actorUserId: user.id,
      actorRole: user.role,
      targetType,
      targetId,
      metadata,
    },
  });
}

export async function resolveCaseAccessContext(caseIdOrUid: string): Promise<CaseAccessContext | null> {
  const result = await db.query<{
    case_id: string;
    case_uid: string;
    team_id: number | null;
    mode: "LIVE" | "TRAINING";
  }>(
    `
      SELECT case_id, case_uid, team_id, mode
      FROM cases
      WHERE case_uid = $1 OR case_id = $1
      ORDER BY CASE WHEN case_uid = $1 THEN 0 ELSE 1 END
      LIMIT 1
    `,
    [caseIdOrUid],
  );

  const row = result.rows[0];
  if (!row) return null;
  return {
    caseId: row.case_id,
    caseUid: row.case_uid,
    caseTeamId: row.team_id,
    mode: row.mode,
  };
}

export async function authorizeCaseReadAccess(
  user: AuthenticatedUser | null,
  caseIdOrUid: string,
): Promise<AccessResult<CaseAccessContext>> {
  if (!user) return { ok: false, status: 401, message: "Unauthorized" };
  if (!isCaseReader(user)) {
    await auditForbiddenAccess(user, "case", caseIdOrUid, "Case read is not allowed for this role.");
    return { ok: false, status: 403, message: "Forbidden" };
  }

  const context = await resolveCaseAccessContext(caseIdOrUid);
  if (!context) return { ok: false, status: 404, message: "Not found" };
  if (context.mode !== user.currentMode) {
    return { ok: false, status: 404, message: "Not found" };
  }
  if (!canReadCaseTeam(user, context.caseTeamId)) {
    await auditForbiddenAccess(user, "case", context.caseUid, "Case read is not allowed for this owner scope.", {
      caseId: context.caseId,
      caseUid: context.caseUid,
    });
    return { ok: false, status: 404, message: "Not found" };
  }

  return { ok: true, context };
}

export async function authorizeCaseEditAccess(
  user: AuthenticatedUser | null,
  caseIdOrUid: string,
): Promise<AccessResult<CaseAccessContext>> {
  if (!user) return { ok: false, status: 401, message: "Unauthorized" };
  if (user.role !== "EMS") {
    await auditForbiddenAccess(user, "case", caseIdOrUid, "Case edit is not allowed for this role.");
    return { ok: false, status: 403, message: "Forbidden" };
  }

  const context = await resolveCaseAccessContext(caseIdOrUid);
  if (!context) return { ok: false, status: 404, message: "Not found" };
  if (context.mode !== user.currentMode) {
    return { ok: false, status: 404, message: "Not found" };
  }
  if (!canEditCaseTeam(user, context.caseTeamId)) {
    await auditForbiddenAccess(user, "case", context.caseUid, "Case edit is not allowed for this owner scope.", {
      caseId: context.caseId,
      caseUid: context.caseUid,
    });
    return { ok: false, status: 404, message: "Not found" };
  }

  return { ok: true, context };
}

export async function getCaseTargetAccessContextByTargetId(targetId: number): Promise<CaseTargetAccessContext | null> {
  const result = await db.query<{
    id: number;
    status: string;
    hospital_id: number;
    request_id: string;
    case_id: string;
    case_uid: string;
    case_team_id: number | null;
    mode: "LIVE" | "TRAINING";
  }>(
    `
      SELECT
        t.id,
        t.status,
        t.hospital_id,
        r.request_id,
        r.case_id,
        r.case_uid,
        r.mode,
        c.team_id AS case_team_id
      FROM hospital_request_targets t
      JOIN hospital_requests r ON r.id = t.hospital_request_id
      JOIN cases c ON c.case_uid = r.case_uid
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
    caseUid: row.case_uid,
    caseTeamId: row.case_team_id,
    mode: row.mode,
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
    case_uid: string;
    case_team_id: number | null;
    mode: "LIVE" | "TRAINING";
  }>(
    `
      SELECT
        t.id,
        t.status,
        t.hospital_id,
        r.request_id,
        r.case_id,
        r.case_uid,
        r.mode,
        c.team_id AS case_team_id
      FROM hospital_request_targets t
      JOIN hospital_requests r ON r.id = t.hospital_request_id
      JOIN cases c ON c.case_uid = r.case_uid
      WHERE (r.case_uid = $1 OR r.case_id = $1)
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
    caseUid: row.case_uid,
    caseTeamId: row.case_team_id,
    mode: row.mode,
  };
}

export async function authorizeCaseTargetReadAccess(
  user: AuthenticatedUser | null,
  targetId: number,
): Promise<AccessResult<CaseTargetAccessContext>> {
  if (!user) return { ok: false, status: 401, message: "Unauthorized" };
  if (!isCaseReader(user)) {
    await auditForbiddenAccess(user, "hospital_request_target", String(targetId), "Case target read is not allowed for this role.");
    return { ok: false, status: 403, message: "Forbidden" };
  }

  const context = await getCaseTargetAccessContextByTargetId(targetId);
  if (!context) return { ok: false, status: 404, message: "Not found" };
  if (context.mode !== user.currentMode) {
    return { ok: false, status: 404, message: "Not found" };
  }
  if (!canReadCaseTeam(user, context.caseTeamId)) {
    await auditForbiddenAccess(user, "hospital_request_target", String(targetId), "Case target read is not allowed for this owner scope.", {
      caseId: context.caseId,
      caseUid: context.caseUid,
    });
    return { ok: false, status: 404, message: "Not found" };
  }

  return { ok: true, context };
}

export async function authorizeCaseTargetEditAccess(
  user: AuthenticatedUser | null,
  targetId: number,
): Promise<AccessResult<CaseTargetAccessContext>> {
  if (!user) return { ok: false, status: 401, message: "Unauthorized" };
  if (user.role !== "EMS") {
    await auditForbiddenAccess(user, "hospital_request_target", String(targetId), "Case target edit is not allowed for this role.");
    return { ok: false, status: 403, message: "Forbidden" };
  }

  const context = await getCaseTargetAccessContextByTargetId(targetId);
  if (!context) return { ok: false, status: 404, message: "Not found" };
  if (context.mode !== user.currentMode) {
    return { ok: false, status: 404, message: "Not found" };
  }
  if (!canEditCaseTeam(user, context.caseTeamId)) {
    await auditForbiddenAccess(user, "hospital_request_target", String(targetId), "Case target edit is not allowed for this owner scope.", {
      caseId: context.caseId,
      caseUid: context.caseUid,
    });
    return { ok: false, status: 404, message: "Not found" };
  }

  return { ok: true, context };
}

export async function authorizeHospitalTargetAccess(
  user: AuthenticatedUser | null,
  targetId: number,
): Promise<AccessResult<CaseTargetAccessContext>> {
  if (!user) return { ok: false, status: 401, message: "Unauthorized" };
  if (user.role !== "HOSPITAL" || !user.hospitalId) {
    await auditForbiddenAccess(user, "hospital_request_target", String(targetId), "Hospital target access is not allowed for this role.");
    return { ok: false, status: 403, message: "Forbidden" };
  }

  const context = await getCaseTargetAccessContextByTargetId(targetId);
  if (!context) return { ok: false, status: 404, message: "Not found" };
  if (context.mode !== user.currentMode) {
    return { ok: false, status: 404, message: "Not found" };
  }
  if (context.hospitalId !== user.hospitalId) {
    await auditForbiddenAccess(user, "hospital_request_target", String(targetId), "Hospital target access is not allowed for this owner scope.", {
      caseId: context.caseId,
      caseUid: context.caseUid,
      hospitalId: context.hospitalId,
    });
    return { ok: false, status: 404, message: "Not found" };
  }

  return { ok: true, context };
}
