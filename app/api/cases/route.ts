import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { canEditCaseTeam } from "@/lib/caseAccess";
import { getDefaultCaseDivision, isCurrentCaseDivision } from "@/lib/caseDivision";
import { createCaseUid } from "@/lib/caseIdentity";
import { ensureCasesColumns } from "@/lib/casesSchema";
import { db } from "@/lib/db";
import { authorizeEmsRoute } from "@/lib/routeAccess";

type SaveCaseRequest = {
  caseId: string;
  division: string;
  awareDate: string;
  awareTime: string;
  patientName: string;
  age: number;
  address: string;
  symptom?: string;
  destination?: string | null;
  note?: string;
  casePayload?: unknown;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SaveCaseRequest;
    const access = authorizeEmsRoute(await getAuthenticatedUser());
    if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });
    const user = access.user;

    if (!body.caseId || !body.patientName || !body.address) {
      return NextResponse.json({ message: "必須項目が不足しています。" }, { status: 400 });
    }

    await ensureCasesColumns();

    let resolvedDivision = isCurrentCaseDivision(body.division) ? body.division : null;
    if (!resolvedDivision && user.teamId != null) {
      const teamRes = await db.query<{ division: string | null }>(
        `
          SELECT division
          FROM emergency_teams
          WHERE id = $1
          LIMIT 1
        `,
        [user.teamId],
      );
      const teamDivision = teamRes.rows[0]?.division;
      resolvedDivision = isCurrentCaseDivision(teamDivision) ? teamDivision : null;
    }

    const existingCaseRes = await db.query<{ team_id: number | null }>(
      `
        SELECT team_id
        FROM cases
        WHERE case_id = $1
        LIMIT 1
      `,
      [body.caseId],
    );
    const existingCase = existingCaseRes.rows[0];
    if (existingCase && !canEditCaseTeam(user, existingCase.team_id)) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const nextCaseUid = createCaseUid();
    const result = await db.query(
      `
      INSERT INTO cases (
        case_id, case_uid, division, aware_date, aware_time, patient_name, age, address, symptom, destination, note, team_id, case_payload, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, NOW()
      )
      ON CONFLICT (case_id) DO UPDATE SET
        division = EXCLUDED.division,
        aware_date = EXCLUDED.aware_date,
        aware_time = EXCLUDED.aware_time,
        patient_name = EXCLUDED.patient_name,
        age = EXCLUDED.age,
        address = EXCLUDED.address,
        symptom = EXCLUDED.symptom,
        destination = EXCLUDED.destination,
        note = EXCLUDED.note,
        case_uid = COALESCE(cases.case_uid, EXCLUDED.case_uid),
        team_id = COALESCE(cases.team_id, EXCLUDED.team_id),
        case_payload = EXCLUDED.case_payload,
        updated_at = NOW()
      RETURNING case_id
      `,
      [
        body.caseId,
        nextCaseUid,
        resolvedDivision ?? getDefaultCaseDivision(),
        body.awareDate || "",
        body.awareTime || "",
        body.patientName || "不明",
        Number.isFinite(body.age) ? body.age : 0,
        body.address || "",
        body.symptom ?? null,
        body.destination ?? null,
        body.note ?? null,
        user.teamId,
        JSON.stringify(body.casePayload ?? {}),
      ],
    );

    return NextResponse.json({ caseId: result.rows[0]?.case_id ?? body.caseId });
  } catch (e) {
    console.error("POST /api/cases failed", e);
    return NextResponse.json({ message: "保存に失敗しました。" }, { status: 500 });
  }
}
