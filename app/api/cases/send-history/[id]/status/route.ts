import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { authorizeCaseTargetEditAccess } from "@/lib/caseAccess";
import { isHospitalRequestStatus } from "@/lib/hospitalRequestStatus";
import { updateSendHistoryStatus } from "@/lib/sendHistoryStatusRepository";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const targetId = Number(params.id);
    if (!Number.isFinite(targetId)) {
      return NextResponse.json({ message: "Invalid targetId" }, { status: 400 });
    }

    const body = (await req.json()) as {
      nextStatus?: unknown;
      note?: unknown;
      reasonCode?: unknown;
      reasonText?: unknown;
    };
    if (!isHospitalRequestStatus(body.nextStatus)) {
      return NextResponse.json({ message: "Invalid nextStatus" }, { status: 400 });
    }

    const user = await getAuthenticatedUser();
    const access = await authorizeCaseTargetEditAccess(user, targetId);
    if (!access.ok) {
      return NextResponse.json({ message: access.message }, { status: access.status });
    }
    const actor = user!;

    const result = await updateSendHistoryStatus({
      targetId,
      nextStatus: body.nextStatus,
      actor,
      note: typeof body.note === "string" ? body.note : null,
      reasonCode: typeof body.reasonCode === "string" ? body.reasonCode : null,
      reasonText: typeof body.reasonText === "string" ? body.reasonText : null,
    });

    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: result.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("PATCH /api/cases/send-history/[id]/status failed", error);
    return NextResponse.json({ message: "搬送判断ステータスの更新に失敗しました。" }, { status: 500 });
  }
}
