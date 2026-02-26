import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authContext";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";
import { getHospitalRequestDetail, markHospitalRequestAsRead } from "@/lib/hospitalRequestRepository";

type Params = {
  params: Promise<{ targetId: string }>;
};

export async function GET(_: Request, { params }: Params) {
  try {
    await ensureHospitalRequestTables();
    const { targetId: rawTargetId } = await params;
    const targetId = Number(rawTargetId);
    if (!Number.isFinite(targetId)) {
      return NextResponse.json({ message: "Invalid targetId" }, { status: 400 });
    }

    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "HOSPITAL" || !user.hospitalId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const detail = await getHospitalRequestDetail(targetId);
    if (!detail) return NextResponse.json({ message: "Not found" }, { status: 404 });
    if (detail.hospitalId !== user.hospitalId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (detail.status === "UNREAD") {
      const changed = await markHospitalRequestAsRead(targetId, user.id);
      if (changed) {
        detail.status = "READ";
        detail.statusLabel = "既読";
      }
    }

    return NextResponse.json({
      targetId: detail.targetId,
      requestId: detail.requestId,
      caseId: detail.caseId,
      sentAt: detail.sentAt,
      status: detail.status,
      statusLabel: detail.statusLabel,
      openedAt: detail.openedAt,
      patientSummary: detail.patientSummary,
      selectedDepartments: detail.selectedDepartments,
      fromTeamCode: detail.fromTeamCode,
      fromTeamName: detail.fromTeamName,
    });
  } catch (error) {
    console.error("GET /api/hospitals/requests/[targetId] failed", error);
    return NextResponse.json({ message: "受入依頼詳細の取得に失敗しました。" }, { status: 500 });
  }
}
