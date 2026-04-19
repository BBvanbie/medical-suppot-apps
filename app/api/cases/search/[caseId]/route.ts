import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { canReadCaseTeam, isCaseReader, resolveCaseAccessContext } from "@/lib/caseAccess";
import { ensureCasesColumns } from "@/lib/casesSchema";
import { listCaseSelectionHistoryByCaseUid } from "@/lib/caseSelectionHistory";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";

type Params = {
  params: Promise<{ caseId: string }>;
};

export async function GET(_: Request, { params }: Params) {
  try {
    const [{ caseId }, user] = await Promise.all([params, getAuthenticatedUser()]);
    if (!caseId) return NextResponse.json({ message: "caseId is required." }, { status: 400 });
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!isCaseReader(user)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const [, , context] = await Promise.all([
      ensureCasesColumns(),
      ensureHospitalRequestTables(),
      resolveCaseAccessContext(caseId),
    ]);
    if (!context || context.mode !== user.currentMode || !canReadCaseTeam(user, context.caseTeamId)) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const history = await listCaseSelectionHistoryByCaseUid(context.caseUid, {
      caseId: context.caseId,
      caseUid: context.caseUid,
      caseTeamId: context.caseTeamId,
    });
    if (!history) return NextResponse.json({ message: "Not found" }, { status: 404 });

    return NextResponse.json({ caseId: history.caseId, caseUid: history.caseUid, targets: history.items });
  } catch (e) {
    console.error("GET /api/cases/search/[caseId] failed", e);
    return NextResponse.json({ message: "選定病院一覧の取得に失敗しました。" }, { status: 500 });
  }
}
