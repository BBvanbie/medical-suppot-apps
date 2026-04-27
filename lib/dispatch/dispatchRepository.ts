import type { AuthenticatedUser } from "@/lib/authContext";
import { ensureCasesColumns } from "@/lib/casesSchema";
import { isCurrentCaseDivision } from "@/lib/caseDivision";
import { createCaseUid, formatDispatchCaseId } from "@/lib/caseIdentity";
import { db } from "@/lib/db";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";

import type { DispatchCaseCreateInput } from "@/lib/dispatch/dispatchValidation";

export type DispatchTeamOption = {
  id: number;
  label: string;
  teamName: string;
  teamCode: string;
  division: string;
};

export type DispatchCaseRow = {
  caseId: string;
  teamId: number | null;
  teamName: string;
  division: string;
  dispatchDate: string;
  dispatchTime: string;
  dispatchAddress: string;
  destination: string | null;
  createdAt: string;
  createdFrom: string;
  mode: string;
  caseStatus: string;
  selectionRequestCount: number;
  isTriageDispatchReport: boolean;
  hasDispatchSelectionRequest: boolean;
  dispatchSelectionDepartments: string[];
};

export type DispatchCaseListScope = "all" | "commandHistory" | "activeCases" | "selectionRequests";

type CreateDispatchCaseResult =
  | { success: true; caseId: string; caseIds: string[] }
  | { success: false; message: string; fieldErrors?: Record<string, string> };

type DispatchTeamDbRow = {
  id: number;
  team_code: string;
  team_name: string;
  is_active: boolean;
  division: string;
  case_number_code: string;
};

function toDispatchAtIso(dispatchDate: string, dispatchTime: string) {
  return new Date(`${dispatchDate}T${dispatchTime}:00+09:00`).toISOString();
}

export async function listDispatchTeamOptions(): Promise<DispatchTeamOption[]> {
  const result = await db.query<DispatchTeamDbRow>(`
    SELECT id, team_code, team_name, is_active, division, case_number_code
    FROM emergency_teams
    WHERE is_active = TRUE
    ORDER BY display_order ASC, team_name ASC, id ASC
  `);

  return result.rows.map((row) => ({
    id: row.id,
    label: `${row.team_name} (${row.team_code})`,
    teamName: row.team_name,
    teamCode: row.team_code,
    division: row.division,
  }));
}

export async function listDispatchCases(
  mode: "LIVE" | "TRAINING" = "LIVE",
  scope: DispatchCaseListScope = "all",
  limit = 200,
): Promise<DispatchCaseRow[]> {
  await Promise.all([ensureCasesColumns(), ensureHospitalRequestTables()]);
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 500) : 200;
  const scopeWhere =
    scope === "commandHistory"
      ? "c.created_from = 'DISPATCH'"
      : scope === "selectionRequests"
        ? "COALESCE(req_summary.selection_request_count, 0) > 0"
        : scope === "activeCases"
          ? "(c.case_status IS NULL OR c.case_status NOT IN ('CLOSED', 'COMPLETED', 'CANCELLED'))"
          : `(
              c.created_from = 'DISPATCH'
              OR c.case_payload->'summary'->>'triageDispatchReport' = 'true'
            )`;
  const result = await db.query<{
    case_id: string;
    team_id: number | null;
    team_name: string | null;
    division: string | null;
    aware_date: string | null;
    aware_time: string | null;
    address: string | null;
    destination: string | null;
    created_at: Date | string;
    created_from: string | null;
    mode: string | null;
    case_status: string | null;
    selection_request_count: number | null;
    is_triage_dispatch_report: boolean | null;
    has_dispatch_selection_request: boolean | null;
    dispatch_selection_departments: string[] | null;
  }>(`
    SELECT
      c.case_id,
      c.team_id,
      et.team_name,
      c.division,
      c.aware_date,
      c.aware_time,
      c.address,
      c.destination,
      c.created_at,
      c.created_from,
      c.mode,
      c.case_status,
      COALESCE(req_summary.selection_request_count, 0) AS selection_request_count,
      (
        c.case_payload->'summary'->>'triageDispatchReport' = 'true'
        OR c.case_payload->'summary'->>'triageWorkflow' = 'DISPATCH_COORDINATED'
      ) AS is_triage_dispatch_report,
      (
        c.case_payload->'summary'->'dispatchSelectionRequest'->>'flow' = 'CRITICAL_CARE'
        OR c.case_payload->'summary'->'dispatchSelectionRequest'->>'status' = 'REQUESTED'
      ) AS has_dispatch_selection_request,
      COALESCE(c.case_payload->'summary'->'dispatchSelectionRequest'->'selectedDepartments', '[]'::jsonb)::jsonb AS dispatch_selection_departments
    FROM cases c
    LEFT JOIN emergency_teams et ON et.id = c.team_id
    LEFT JOIN LATERAL (
      SELECT (
        COUNT(t.id)
        + COUNT(*) FILTER (
          WHERE t.id IS NULL
            AND COALESCE(r.patient_summary->>'dispatchSelectionManaged', '') = 'true'
        )
      )::int AS selection_request_count
      FROM hospital_requests r
      LEFT JOIN hospital_request_targets t ON t.hospital_request_id = r.id
      WHERE r.case_uid = c.case_uid
    ) req_summary ON TRUE
    WHERE ${scopeWhere}
      AND c.mode = $1
    ORDER BY c.created_at DESC, c.id DESC
    LIMIT $2
  `, [mode, safeLimit]);

  return result.rows.map((row) => ({
    caseId: row.case_id,
    teamId: row.team_id,
    teamName: row.team_name ?? "-",
    division: row.division ?? "",
    dispatchDate: row.aware_date ?? "",
    dispatchTime: row.aware_time ?? "",
    dispatchAddress: row.address ?? "",
    destination: row.destination ?? null,
    createdAt: new Date(row.created_at).toISOString(),
    createdFrom: row.created_from ?? "EMS",
    mode: row.mode ?? "LIVE",
    caseStatus: row.case_status ?? "NEW",
    selectionRequestCount: row.selection_request_count ?? 0,
    isTriageDispatchReport: row.is_triage_dispatch_report === true,
    hasDispatchSelectionRequest: row.has_dispatch_selection_request === true,
    dispatchSelectionDepartments: Array.isArray(row.dispatch_selection_departments) ? row.dispatch_selection_departments : [],
  }));
}

export async function createDispatchCase(
  input: DispatchCaseCreateInput,
  actor: AuthenticatedUser,
): Promise<CreateDispatchCaseResult> {
  await ensureCasesColumns();
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const teamResult = await client.query<DispatchTeamDbRow>(
      `
        SELECT id, team_code, team_name, is_active, division, case_number_code
        FROM emergency_teams
        WHERE id = ANY($1::int[])
      `,
      [input.teamIds],
    );

    const teamById = new Map(teamResult.rows.map((team) => [team.id, team]));
    const orderedTeams = input.teamIds.map((teamId) => teamById.get(teamId)).filter((team): team is DispatchTeamDbRow => Boolean(team));
    if (orderedTeams.length !== input.teamIds.length || orderedTeams.some((team) => !team.is_active)) {
      await client.query("ROLLBACK");
      return {
        success: false,
        message: "選択した出場隊の一部が見つかりません。",
        fieldErrors: { teamIds: "有効な出場隊を選択してください。", teamId: "有効な出場隊を選択してください。" },
      };
    }
    const invalidDivisionTeam = orderedTeams.find((team) => !isCurrentCaseDivision(team.division));
    if (invalidDivisionTeam) {
      await client.query("ROLLBACK");
      return {
        success: false,
        message: "選択した出場隊の方面区分が不正です。",
        fieldErrors: { teamIds: "隊マスタの方面区分を確認してください。", teamId: "隊マスタの方面区分を確認してください。" },
      };
    }

    const dateKey = input.dispatchDate.replace(/-/g, "");
    const dispatchAt = toDispatchAtIso(input.dispatchDate, input.dispatchTime);
    const dispatchGroupId = createCaseUid();
    const createdCaseIds: string[] = [];

    for (const team of orderedTeams) {
      const teamCaseNumberCode = team.case_number_code;
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`dispatch-case:${dateKey}:${teamCaseNumberCode}`]);

      const sequenceResult = await client.query<{ last_sequence: number }>(
        `
          SELECT COALESCE(MAX(CAST(split_part(case_id, '-', 3) AS INTEGER)), 0) AS last_sequence
          FROM cases
          WHERE case_id LIKE $1
        `,
        [`${dateKey}-${teamCaseNumberCode}-%`],
      );

      const nextSequence = (sequenceResult.rows[0]?.last_sequence ?? 0) + 1;
      const caseId = formatDispatchCaseId(dateKey, teamCaseNumberCode, nextSequence);
      const caseUid = createCaseUid();
      const casePayload = {
        dispatch: {
          awareDate: input.dispatchDate,
          awareTime: input.dispatchTime,
          dispatchAddress: input.dispatchAddress,
          dispatchGroupId,
          dispatchedTeamIds: input.teamIds,
        },
        meta: {
          createdFrom: "DISPATCH",
          dispatchGroupId,
        },
      };

      await client.query(
        `
          INSERT INTO cases (
            case_id,
            case_uid,
            division,
            aware_date,
            aware_time,
            patient_name,
            age,
            address,
            symptom,
            destination,
            note,
            team_id,
            mode,
            case_payload,
            dispatch_at,
            created_from,
            created_by_user_id,
            case_status,
            updated_at
          ) VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            NULL,
            NULL,
            NULL,
            $9,
            $10,
            $11::jsonb,
            $12,
            'DISPATCH',
            $13,
            'NEW',
            NOW()
          )
        `,
        [
          caseId,
          caseUid,
          team.division,
          input.dispatchDate,
          input.dispatchTime,
          null,
          null,
          input.dispatchAddress,
          team.id,
          actor.currentMode,
          JSON.stringify(casePayload),
          dispatchAt,
          actor.id,
        ],
      );
      createdCaseIds.push(caseId);
    }

    await client.query("COMMIT");
    return { success: true, caseId: createdCaseIds[0], caseIds: createdCaseIds };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
