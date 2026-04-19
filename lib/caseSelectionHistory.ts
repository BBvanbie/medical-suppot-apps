import { db } from "@/lib/db";
import { isHospitalRequestStatus } from "@/lib/hospitalRequestStatus";
import type { CaseSelectionHistoryItem } from "@/lib/caseSelectionHistoryTypes";

type CaseSelectionHistoryRow = {
  case_id: string;
  case_uid: string;
  target_id: number;
  request_id: string;
  sent_at: string;
  hospital_name: string;
  status: string;
  updated_at: string;
  last_actor: "A" | "HP" | null;
  selected_departments: string[] | null;
  latest_hp_comment: string | null;
  latest_a_reply: string | null;
  case_team_id: number | null;
};

export type CaseSelectionHistoryResult = {
  caseId: string;
  caseUid: string;
  caseTeamId: number | null;
  items: CaseSelectionHistoryItem[];
};

type ResolvedCaseSelectionMetadata = {
  caseId: string;
  caseUid: string;
  caseTeamId: number | null;
};

async function listCaseSelectionHistoryInternal(
  caseUidOrLookupId: string,
  metadata?: ResolvedCaseSelectionMetadata,
): Promise<CaseSelectionHistoryResult | null> {
  const result = await db.query<CaseSelectionHistoryRow>(
    metadata
      ? `
          SELECT
            t.id AS target_id,
            r.request_id,
            r.sent_at::text AS sent_at,
            h.name AS hospital_name,
            t.status,
            t.updated_at::text AS updated_at,
            last_event.last_actor,
            COALESCE(t.selected_departments, '[]'::jsonb)::jsonb AS selected_departments,
            latest_hp.comment AS latest_hp_comment,
            latest_a.reply AS latest_a_reply
          FROM hospital_requests r
          LEFT JOIN hospital_request_targets t ON t.hospital_request_id = r.id
          LEFT JOIN hospitals h ON h.id = t.hospital_id
          LEFT JOIN LATERAL (
            SELECT e.note AS comment
            FROM hospital_request_events e
            WHERE e.target_id = t.id
              AND e.event_type = 'hospital_response'
              AND e.note IS NOT NULL
              AND btrim(e.note) <> ''
            ORDER BY e.acted_at DESC, e.id DESC
            LIMIT 1
          ) latest_hp ON TRUE
          LEFT JOIN LATERAL (
            SELECT e.note AS reply
            FROM hospital_request_events e
            WHERE e.target_id = t.id
              AND e.event_type = 'paramedic_consult_reply'
              AND e.note IS NOT NULL
              AND btrim(e.note) <> ''
            ORDER BY e.acted_at DESC, e.id DESC
            LIMIT 1
          ) latest_a ON TRUE
          LEFT JOIN LATERAL (
            SELECT
              CASE
                WHEN e.event_type = 'paramedic_consult_reply' THEN 'A'
                ELSE 'HP'
              END AS last_actor
            FROM hospital_request_events e
            WHERE e.target_id = t.id
              AND (
                (e.event_type = 'hospital_response' AND e.to_status = 'NEGOTIATING')
                OR e.event_type = 'paramedic_consult_reply'
              )
            ORDER BY e.acted_at DESC, e.id DESC
            LIMIT 1
          ) last_event ON TRUE
          WHERE r.case_uid = $1
          ORDER BY t.updated_at DESC NULLS LAST, t.id DESC NULLS LAST
        `
      : `
          SELECT
            c.case_id,
            c.case_uid,
            t.id AS target_id,
            r.request_id,
            r.sent_at::text AS sent_at,
            h.name AS hospital_name,
            t.status,
            t.updated_at::text AS updated_at,
            last_event.last_actor,
            COALESCE(t.selected_departments, '[]'::jsonb)::jsonb AS selected_departments,
            latest_hp.comment AS latest_hp_comment,
            latest_a.reply AS latest_a_reply,
            c.team_id AS case_team_id
          FROM cases c
          LEFT JOIN hospital_requests r ON r.case_uid = c.case_uid
          LEFT JOIN hospital_request_targets t ON t.hospital_request_id = r.id
          LEFT JOIN hospitals h ON h.id = t.hospital_id
          LEFT JOIN LATERAL (
            SELECT e.note AS comment
            FROM hospital_request_events e
            WHERE e.target_id = t.id
              AND e.event_type = 'hospital_response'
              AND e.note IS NOT NULL
              AND btrim(e.note) <> ''
            ORDER BY e.acted_at DESC, e.id DESC
            LIMIT 1
          ) latest_hp ON TRUE
          LEFT JOIN LATERAL (
            SELECT e.note AS reply
            FROM hospital_request_events e
            WHERE e.target_id = t.id
              AND e.event_type = 'paramedic_consult_reply'
              AND e.note IS NOT NULL
              AND btrim(e.note) <> ''
            ORDER BY e.acted_at DESC, e.id DESC
            LIMIT 1
          ) latest_a ON TRUE
          LEFT JOIN LATERAL (
            SELECT
              CASE
                WHEN e.event_type = 'paramedic_consult_reply' THEN 'A'
                ELSE 'HP'
              END AS last_actor
            FROM hospital_request_events e
            WHERE e.target_id = t.id
              AND (
                (e.event_type = 'hospital_response' AND e.to_status = 'NEGOTIATING')
                OR e.event_type = 'paramedic_consult_reply'
              )
            ORDER BY e.acted_at DESC, e.id DESC
            LIMIT 1
          ) last_event ON TRUE
          WHERE c.case_uid = COALESCE((SELECT case_uid FROM cases WHERE case_uid = $1 OR case_id = $1 ORDER BY CASE WHEN case_uid = $1 THEN 0 ELSE 1 END LIMIT 1), $1)
          ORDER BY t.updated_at DESC NULLS LAST, t.id DESC NULLS LAST
        `,
    [caseUidOrLookupId],
  );

  const firstRow = result.rows[0];
  if (!firstRow) return null;

  return {
    caseId: metadata?.caseId ?? firstRow.case_id,
    caseUid: metadata?.caseUid ?? firstRow.case_uid,
    caseTeamId: metadata?.caseTeamId ?? firstRow.case_team_id,
    items: result.rows
      .filter((row) => Number.isFinite(Number(row.target_id)))
      .map((row) => ({
        targetId: Number(row.target_id),
        requestId: row.request_id,
        sentAt: row.sent_at,
        hospitalName: row.hospital_name,
        status: isHospitalRequestStatus(row.status) ? row.status : "UNREAD",
        updatedAt: row.updated_at,
        lastActor: row.last_actor,
        selectedDepartments: Array.isArray(row.selected_departments)
          ? row.selected_departments.filter((value): value is string => typeof value === "string")
          : [],
        latestHpComment: row.latest_hp_comment ?? null,
        latestAReply: row.latest_a_reply ?? null,
      })),
  };
}

export async function listCaseSelectionHistory(caseId: string): Promise<CaseSelectionHistoryResult | null> {
  return listCaseSelectionHistoryInternal(caseId);
}

export async function listCaseSelectionHistoryByCaseUid(
  caseUid: string,
  metadata?: ResolvedCaseSelectionMetadata,
): Promise<CaseSelectionHistoryResult | null> {
  return listCaseSelectionHistoryInternal(caseUid, metadata);
}
