import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { isHospitalRequestStatus } from "@/lib/hospitalRequestStatus";
import { updateSendHistoryStatus } from "@/lib/sendHistoryStatusRepository";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const params = await context.params;
    const targetId = Number(params.id);
    if (!Number.isFinite(targetId)) {
      return NextResponse.json({ message: "Invalid targetId" }, { status: 400 });
    }

    const body = (await req.json()) as { nextStatus?: unknown; note?: unknown };
    if (!isHospitalRequestStatus(body.nextStatus)) {
      return NextResponse.json({ message: "Invalid nextStatus" }, { status: 400 });
    }

    const result = await updateSendHistoryStatus({
      targetId,
      nextStatus: body.nextStatus,
      actor: user,
      note: typeof body.note === "string" ? body.note : null,
    });

    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: result.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("PATCH /api/cases/send-history/[id]/status failed", error);
    return NextResponse.json({ message: "送信履歴ステータスの更新に失敗しました。" }, { status: 500 });
  }
}
