import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { updateSendHistoryStatus } from "@/lib/sendHistoryStatusRepository";

type Params = {
  params: Promise<{ targetId: string }>;
};

type Body = {
  status?: unknown;
  note?: unknown;
};

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { targetId: rawTargetId } = await params;
    const targetId = Number(rawTargetId);
    if (!Number.isFinite(targetId)) {
      return NextResponse.json({ message: "Invalid targetId" }, { status: 400 });
    }

    const body = (await req.json()) as Body;
    if (body.status !== "TRANSPORT_DECIDED" && body.status !== "TRANSPORT_DECLINED") {
      return NextResponse.json({ message: "Invalid decision status" }, { status: 400 });
    }

    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "EMS") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const result = await updateSendHistoryStatus({
      targetId,
      nextStatus: body.status,
      actor: user,
      note: typeof body.note === "string" ? body.note : null,
    });

    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: result.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("PATCH /api/paramedics/requests/[targetId]/decision failed", error);
    return NextResponse.json({ message: "搬送判断の更新に失敗しました。" }, { status: 500 });
  }
}
