import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { pickPatientSummaryFromCasePayload } from "@/lib/casePatientSummary";
import { ensureCasesColumns } from "@/lib/casesSchema";
import { db } from "@/lib/db";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";
import { listCaseSelectionHistory } from "@/lib/caseSelectionHistory";
import { authorizeAdminRoute } from "@/lib/routeAccess";

type Params = {
  params: Promise<{ caseId: string }>;
};

type CaseDetailRow = {
  case_id: string;
  case_uid: string;
  case_payload: unknown;
  team_name: string | null;
};

export async function GET(_: Request, { params }: Params) {
  try {
    await ensureCasesColumns();
    await ensureHospitalRequestTables();

    const access = authorizeAdminRoute(await getAuthenticatedUser());
    if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });

    const { caseId } = await params;
    if (!caseId) return NextResponse.json({ message: "caseId is required." }, { status: 400 });

    const caseResult = await db.query<CaseDetailRow>(
      `
        SELECT
          c.case_id,
          c.case_uid,
          c.case_payload,
          et.team_name
        FROM cases c
        LEFT JOIN emergency_teams et ON et.id = c.team_id
        WHERE c.case_uid = $1 OR c.case_id = $1
        ORDER BY CASE WHEN c.case_uid = $1 THEN 0 ELSE 1 END
        LIMIT 1
      `,
      [caseId],
    );

    const caseRow = caseResult.rows[0];
    if (!caseRow) return NextResponse.json({ message: "Not found" }, { status: 404 });

    const patientSummary = pickPatientSummaryFromCasePayload(caseRow.case_payload);
    const history = await listCaseSelectionHistory(caseRow.case_uid);

    return NextResponse.json({
      caseId: caseRow.case_id,
      patientSummary: {
        ...patientSummary,
        caseId: caseRow.case_id,
        teamName: patientSummary.teamName ?? caseRow.team_name ?? null,
      },
      selectionHistory: history?.items ?? [],
    });
  } catch (error) {
    console.error("GET /api/admin/cases/[caseId] failed", error);
    return NextResponse.json({ message: "事案詳細の取得に失敗しました。" }, { status: 500 });
  }
}
