import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { canReadCaseTeam, isCaseReader } from "@/lib/caseAccess";
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

    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!isCaseReader(user)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const { caseId } = await params;
    if (!caseId) return NextResponse.json({ message: "caseId is required." }, { status: 400 });

    const history = await listCaseSelectionHistory(caseId);
    if (!history) return NextResponse.json({ message: "Not found" }, { status: 404 });
    if (!canReadCaseTeam(user, history.caseTeamId)) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ caseId: history.caseId, caseUid: history.caseUid, targets: history.items });
  } catch (e) {
    console.error("GET /api/cases/search/[caseId] failed", e);
    return NextResponse.json({ message: "選定病院一覧の取得に失敗しました。" }, { status: 500 });
  }
}
