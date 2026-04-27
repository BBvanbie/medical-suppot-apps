import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { authorizeHospitalTargetAccess } from "@/lib/caseAccess";
import { isHospitalRequestStatus } from "@/lib/hospitalRequestStatus";
import { updateSendHistoryStatus } from "@/lib/sendHistoryStatusRepository";

type Params = {
  params: Promise<{ targetId: string }>;
};

type Body = {
  status?: unknown;
  note?: unknown;
  reasonCode?: unknown;
  reasonText?: unknown;
  acceptedCapacity?: unknown;
};

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { targetId: rawTargetId } = await params;
    const targetId = Number(rawTargetId);
    if (!Number.isFinite(targetId)) {
      return NextResponse.json({ message: "Invalid targetId" }, { status: 400 });
    }

    const body = ((await req.json().catch(() => ({}))) ?? {}) as Body;
    if (!isHospitalRequestStatus(body.status)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }

    const user = await getAuthenticatedUser();
    const access = await authorizeHospitalTargetAccess(user, targetId);
    if (!access.ok) {
      return NextResponse.json({ message: access.message }, { status: access.status });
    }

    const result = await updateSendHistoryStatus({
      targetId,
      nextStatus: body.status,
      actor: user!,
      note: typeof body.note === "string" ? body.note : null,
      reasonCode: typeof body.reasonCode === "string" ? body.reasonCode : null,
      reasonText: typeof body.reasonText === "string" ? body.reasonText : null,
      acceptedCapacity:
        typeof body.acceptedCapacity === "number" || typeof body.acceptedCapacity === "string"
          ? body.acceptedCapacity
          : null,
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
