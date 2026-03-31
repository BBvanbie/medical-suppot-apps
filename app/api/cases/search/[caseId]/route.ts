import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { authorizeCaseReadAccess } from "@/lib/caseAccess";
import { ensureCasesColumns } from "@/lib/casesSchema";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";
import { listCaseSelectionHistory } from "@/lib/caseSelectionHistory";

type Params = {
  params: Promise<{ caseId: string }>;
};

export async function GET(_: Request, { params }: Params) {
  try {
    await ensureCasesColumns();
    await ensureHospitalRequestTables();

    const { caseId } = await params;
    if (!caseId) return NextResponse.json({ message: "caseId is required." }, { status: 400 });

    const user = await getAuthenticatedUser();
    const access = await authorizeCaseReadAccess(user, caseId);
    if (!access.ok) {
      return NextResponse.json({ message: access.message }, { status: access.status });
    }

    const history = await listCaseSelectionHistory(caseId);
    if (!history) return NextResponse.json({ message: "Not found" }, { status: 404 });

    return NextResponse.json({ caseId: history.caseId, caseUid: history.caseUid, targets: history.items });
  } catch (e) {
    console.error("GET /api/cases/search/[caseId] failed", e);
    return NextResponse.json({ message: "選定病院一覧の取得に失敗しました。" }, { status: 500 });
  }
}