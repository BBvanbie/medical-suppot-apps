import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { pickPatientSummaryFromCasePayload } from "@/lib/casePatientSummary";
import { ensureCasesColumns } from "@/lib/casesSchema";
import { db } from "@/lib/db";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";
import { listCaseSelectionHistory } from "@/lib/caseSelectionHistory";

type Params = {
  params: Promise<{ caseId: string }>;
};

type CaseDetailRow = {
  case_id: string;
  case_payload: unknown;
  team_name: string | null;
};

export async function GET(_: Request, { params }: Params) {
  try {
    await ensureCasesColumns();
    await ensureHospitalRequestTables();

    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "ADMIN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const { caseId } = await params;
    if (!caseId) return NextResponse.json({ message: "caseId is required." }, { status: 400 });

    const caseResult = await db.query<CaseDetailRow>(
      `
        SELECT
          c.case_id,
          c.case_payload,
          et.team_name
        FROM cases c
        LEFT JOIN emergency_teams et ON et.id = c.team_id
        WHERE c.case_id = $1
        LIMIT 1
      `,
      [caseId],
    );

    const caseRow = caseResult.rows[0];
    if (!caseRow) return NextResponse.json({ message: "Not found" }, { status: 404 });

    const patientSummary = pickPatientSummaryFromCasePayload(caseRow.case_payload);
    const history = await listCaseSelectionHistory(caseId);

    return NextResponse.json({
      caseId,
      patientSummary: {
        ...patientSummary,
        caseId,
        teamName: patientSummary.teamName ?? caseRow.team_name ?? null,
      },
      selectionHistory: history?.items ?? [],
    });
  } catch (error) {
    console.error("GET /api/admin/cases/[caseId] failed", error);
    return NextResponse.json({ message: "事案詳細の取得に失敗しました。" }, { status: 500 });
  }
}
