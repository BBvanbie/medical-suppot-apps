import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { isHospitalRequestStatus } from "@/lib/hospitalRequestStatus";
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
    if (!isHospitalRequestStatus(body.status)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }

    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "HOSPITAL" || !user.hospitalId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

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
    console.error("PATCH /api/hospitals/requests/[targetId]/status failed", error);
    return NextResponse.json({ message: "病院ステータスの更新に失敗しました。" }, { status: 500 });
  }
}
