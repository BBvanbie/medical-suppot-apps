import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { authorizeCaseTargetEditAccess } from "@/lib/caseAccess";
import { isHospitalRequestStatus } from "@/lib/hospitalRequestStatus";
import { consumeRateLimit } from "@/lib/rateLimit";
import { updateSendHistoryStatus } from "@/lib/sendHistoryStatusRepository";
import { recordApiFailureEvent } from "@/lib/systemMonitor";

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
    const rateLimit = await consumeRateLimit({
      policyName: "critical_update",
      routeKey: "api.cases.send-history.status.patch",
      request: req,
      user: actor,
    });
    if (!rateLimit.ok) {
      return NextResponse.json(
        { message: `搬送判断更新の上限に達しました。${rateLimit.retryAfterSeconds} 秒後に再試行してください。` },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

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
    await recordApiFailureEvent("api.cases.send-history.status.patch", error);
    return NextResponse.json({ message: "搬送判断ステータスの更新に失敗しました。" }, { status: 500 });
  }
}
