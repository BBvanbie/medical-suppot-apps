import type { AuthenticatedUser } from "@/lib/authContext";
import { isCurrentCaseDivision } from "@/lib/caseDivision";
import { createCaseUid, formatDispatchCaseId } from "@/lib/caseIdentity";
import { db } from "@/lib/db";

import type { DispatchCaseCreateInput } from "@/lib/dispatch/dispatchValidation";

export type DispatchTeamOption = {
  id: number;
  label: string;
  teamName: string;
  teamCode: string;
};

export type DispatchCaseRow = {
  caseId: string;
  teamId: number | null;
  teamName: string;
  dispatchDate: string;
  dispatchTime: string;
  dispatchAddress: string;
  createdAt: string;
  createdFrom: string;
  caseStatus: string;
};

type CreateDispatchCaseResult =
  | { success: true; caseId: string }
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
  }));
}

export async function listDispatchCases(): Promise<DispatchCaseRow[]> {
  const result = await db.query<{
    case_id: string;
    team_id: number | null;
    team_name: string | null;
    aware_date: string | null;
    aware_time: string | null;
    address: string | null;
    created_at: Date | string;
    created_from: string | null;
    case_status: string | null;
  }>(`
    SELECT
      c.case_id,
      c.team_id,
      et.team_name,
      c.aware_date,
      c.aware_time,
      c.address,
      c.created_at,
      c.created_from,
      c.case_status
    FROM cases c
    LEFT JOIN emergency_teams et ON et.id = c.team_id
    WHERE c.created_from = 'DISPATCH'
    ORDER BY c.created_at DESC, c.id DESC
  `);

  return result.rows.map((row) => ({
    caseId: row.case_id,
    teamId: row.team_id,
    teamName: row.team_name ?? "-",
    dispatchDate: row.aware_date ?? "",
    dispatchTime: row.aware_time ?? "",
    dispatchAddress: row.address ?? "",
    createdAt: new Date(row.created_at).toISOString(),
    createdFrom: row.created_from ?? "DISPATCH",
    caseStatus: row.case_status ?? "NEW",
  }));
}

export async function createDispatchCase(
  input: DispatchCaseCreateInput,
  actor: AuthenticatedUser,
): Promise<CreateDispatchCaseResult> {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const teamResult = await client.query<DispatchTeamDbRow>(
      `
        SELECT id, team_code, team_name, is_active, division, case_number_code
        FROM emergency_teams
        WHERE id = $1
        LIMIT 1
      `,
      [input.teamId],
    );

    const team = teamResult.rows[0];
    if (!team || !team.is_active) {
      await client.query("ROLLBACK");
      return {
        success: false,
        message: "選択した隊が見つかりません。",
        fieldErrors: { teamId: "有効な隊を選択してください。" },
      };
    }
    if (!isCurrentCaseDivision(team.division)) {
      await client.query("ROLLBACK");
      return {
        success: false,
        message: "選択した隊の方面区分が不正です。",
        fieldErrors: { teamId: "隊マスタの方面区分を確認してください。" },
      };
    }

    const dateKey = input.dispatchDate.replace(/-/g, "");
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
    const dispatchAt = toDispatchAtIso(input.dispatchDate, input.dispatchTime);

    const casePayload = {
      dispatch: {
        awareDate: input.dispatchDate,
        awareTime: input.dispatchTime,
        dispatchAddress: input.dispatchAddress,
      },
      meta: {
        createdFrom: "DISPATCH",
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
          $10::jsonb,
          $11,
          'DISPATCH',
          $12,
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
        JSON.stringify(casePayload),
        dispatchAt,
        actor.id,
      ],
    );

    await client.query("COMMIT");
    return { success: true, caseId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
