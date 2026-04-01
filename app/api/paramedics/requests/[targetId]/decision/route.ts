import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { authorizeCaseTargetEditAccess } from "@/lib/caseAccess";
import { updateSendHistoryStatus } from "@/lib/sendHistoryStatusRepository";

type Params = {
  params: Promise<{ targetId: string }>;
};

type Body = {
  status?: unknown;
  note?: unknown;
  reasonCode?: unknown;
  reasonText?: unknown;
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
    const access = await authorizeCaseTargetEditAccess(user, targetId);
    if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });
    const actor = user!;

    const result = await updateSendHistoryStatus({
      targetId,
      nextStatus: body.status,
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
    console.error("PATCH /api/paramedics/requests/[targetId]/decision failed", error);
    return NextResponse.json({ message: "搬送判断の更新に失敗しました。" }, { status: 500 });
  }
}
