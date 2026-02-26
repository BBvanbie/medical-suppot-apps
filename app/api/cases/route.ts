import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { ensureCasesColumns } from "@/lib/casesSchema";
import { getAuthenticatedUser } from "@/lib/authContext";

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
    const user = await getAuthenticatedUser();

    if (!body.caseId || !body.patientName || !body.address) {
      return NextResponse.json({ message: "必須項目が不足しています。" }, { status: 400 });
    }

    await ensureCasesColumns();

    const result = await db.query(
      `
      INSERT INTO cases (
        case_id, division, aware_date, aware_time, patient_name, age, address, symptom, destination, note, team_id, case_payload, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, NOW()
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
        team_id = COALESCE(cases.team_id, EXCLUDED.team_id),
        case_payload = EXCLUDED.case_payload,
        updated_at = NOW()
      RETURNING case_id
      `,
      [
        body.caseId,
        body.division || "1部",
        body.awareDate || "",
        body.awareTime || "",
        body.patientName || "不明",
        Number.isFinite(body.age) ? body.age : 0,
        body.address || "",
        body.symptom ?? null,
        body.destination ?? null,
        body.note ?? null,
        user?.role === "EMS" ? user.teamId : null,
        JSON.stringify(body.casePayload ?? {}),
      ],
    );

    return NextResponse.json({ caseId: result.rows[0]?.case_id ?? body.caseId });
  } catch (e) {
    console.error("POST /api/cases failed", e);
    return NextResponse.json({ message: "保存に失敗しました。" }, { status: 500 });
  }
}
