import { db } from "@/lib/db";
import type { AppMode } from "@/lib/appMode";

export const SELECTION_STALLED_WARNING_MINUTES = 15;
export const SELECTION_STALLED_CRITICAL_MINUTES = 30;
export const CONSULT_STALLED_WARNING_MINUTES = 10;
export const CONSULT_STALLED_CRITICAL_MINUTES = 20;

export type OperationalAlertSeverity = "warning" | "critical";

export type SelectionStalledCandidate = {
  caseId: string;
  caseUid: string;
  teamId: number | null;
  lastActivityAt: string;
  ageMinutes: number;
  severity: OperationalAlertSeverity;
  targetCount: number;
};

export type ConsultStalledCandidate = {
  targetId: number;
  caseId: string;
  caseUid: string;
  teamId: number | null;
  hospitalId: number;
  lastConsultAt: string;
  ageMinutes: number;
  severity: OperationalAlertSeverity;
};

type SelectionStalledRow = {
  case_id: string;
  case_uid: string;
  from_team_id: number | null;
  last_sent_at: string | null;
  last_responded_at: string | null;
  target_count: number;
};

type ConsultStalledRow = {
  target_id: number;
  case_id: string;
  case_uid: string;
  from_team_id: number | null;
  hospital_id: number;
  latest_consult_at: string;
};

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getAlertSeverity(
  ageMinutes: number,
  warningMinutes: number,
  criticalMinutes: number,
): OperationalAlertSeverity | null {
  if (ageMinutes >= criticalMinutes) return "critical";
  if (ageMinutes >= warningMinutes) return "warning";
  return null;
}

export async function listSelectionStalledCandidates(
  teamId?: number | null,
  mode: AppMode = "LIVE",
): Promise<SelectionStalledCandidate[]> {
  const result = await db.query<SelectionStalledRow>(
    `
      SELECT
        r.case_id,
        r.case_uid,
        r.from_team_id,
        MAX(r.sent_at)::text AS last_sent_at,
        MAX(t.responded_at)::text AS last_responded_at,
        COUNT(*)::int AS target_count
      FROM hospital_requests r
      JOIN hospital_request_targets t ON t.hospital_request_id = r.id
      WHERE ($1::int IS NULL OR r.from_team_id = $1)
        AND r.mode = $2
      GROUP BY r.case_id, r.case_uid, r.from_team_id
      HAVING COUNT(*) > 0
        AND BOOL_OR(t.status = 'TRANSPORT_DECIDED') = FALSE
    `,
    [teamId ?? null, mode],
  );

  const now = Date.now();
  return result.rows
    .map((row) => {
      const lastSentAt = toDate(row.last_sent_at);
      const lastRespondedAt = toDate(row.last_responded_at);
      const lastActivityAt =
        lastSentAt && lastRespondedAt
          ? new Date(Math.max(lastSentAt.getTime(), lastRespondedAt.getTime()))
          : (lastRespondedAt ?? lastSentAt);
      if (!lastActivityAt) return null;

      const ageMinutes = Math.floor((now - lastActivityAt.getTime()) / 60_000);
      const severity = getAlertSeverity(
        ageMinutes,
        SELECTION_STALLED_WARNING_MINUTES,
        SELECTION_STALLED_CRITICAL_MINUTES,
      );
      if (!severity) return null;

      return {
        caseId: row.case_id,
        caseUid: row.case_uid,
        teamId: row.from_team_id,
        lastActivityAt: lastActivityAt.toISOString(),
        ageMinutes,
        severity,
        targetCount: row.target_count,
      } satisfies SelectionStalledCandidate;
    })
    .filter((row): row is SelectionStalledCandidate => Boolean(row))
    .sort((a, b) => b.ageMinutes - a.ageMinutes || a.caseId.localeCompare(b.caseId, "ja"));
}

export async function listConsultStalledCandidates(
  hospitalId?: number | null,
  teamId?: number | null,
  mode: AppMode = "LIVE",
): Promise<ConsultStalledCandidate[]> {
  const result = await db.query<ConsultStalledRow>(
    `
      SELECT
        t.id AS target_id,
        r.case_id,
        r.case_uid,
        r.from_team_id,
        t.hospital_id,
        consult_event.latest_consult_at::text AS latest_consult_at
      FROM hospital_request_targets t
      JOIN hospital_requests r ON r.id = t.hospital_request_id
      JOIN LATERAL (
        SELECT MAX(e.acted_at) AS latest_consult_at
        FROM hospital_request_events e
        WHERE e.target_id = t.id
          AND e.to_status = 'NEGOTIATING'
      ) consult_event ON consult_event.latest_consult_at IS NOT NULL
      WHERE t.status = 'NEGOTIATING'
        AND ($1::int IS NULL OR t.hospital_id = $1)
        AND ($2::int IS NULL OR r.from_team_id = $2)
        AND r.mode = $3
    `,
    [hospitalId ?? null, teamId ?? null, mode],
  );

  const now = Date.now();
  return result.rows
    .map((row) => {
      const lastConsultAt = toDate(row.latest_consult_at);
      if (!lastConsultAt) return null;

      const ageMinutes = Math.floor((now - lastConsultAt.getTime()) / 60_000);
      const severity = getAlertSeverity(
        ageMinutes,
        CONSULT_STALLED_WARNING_MINUTES,
        CONSULT_STALLED_CRITICAL_MINUTES,
      );
      if (!severity) return null;

      return {
        targetId: row.target_id,
        caseId: row.case_id,
        caseUid: row.case_uid,
        teamId: row.from_team_id,
        hospitalId: row.hospital_id,
        lastConsultAt: lastConsultAt.toISOString(),
        ageMinutes,
        severity,
      } satisfies ConsultStalledCandidate;
    })
    .filter((row): row is ConsultStalledCandidate => Boolean(row))
    .sort((a, b) => b.ageMinutes - a.ageMinutes || a.targetId - b.targetId);
}
