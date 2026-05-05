import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { MciWorkflowError, updateMciTransportAssignmentStatus } from "@/lib/triageIncidentRepository";

type Params = {
  params: Promise<{ assignmentId: string }>;
};

type Body = {
  status?: unknown;
  reason?: unknown;
};

function parseAssignmentId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(req: Request, { params }: Params) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "EMS" || !user.teamId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { assignmentId } = await params;
  const id = parseAssignmentId(assignmentId);
  if (!id) return NextResponse.json({ message: "搬送割当IDが不正です。", code: "INVALID_ASSIGNMENT_ID" }, { status: 400 });

  const body = ((await req.json().catch(() => ({}))) ?? {}) as Body;
  const nextStatus =
    body.status === "TRANSPORT_DECLINED" || body.status === "DEPARTED" || body.status === "ARRIVED" ? body.status : null;
  if (!nextStatus) {
    return NextResponse.json({ message: "更新する搬送ステータスが不正です。", code: "INVALID_TRANSPORT_STATUS" }, { status: 400 });
  }

  try {
    const assignment = await updateMciTransportAssignmentStatus({
      assignmentId: id,
      teamId: user.teamId,
      mode: user.currentMode,
      nextStatus,
      reason: typeof body.reason === "string" ? body.reason : "",
    });
    return NextResponse.json({ ok: true, assignment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "MCI搬送ステータス更新に失敗しました。";
    const status = error instanceof MciWorkflowError ? error.status : 400;
    const code = error instanceof MciWorkflowError ? error.code : "MCI_TRANSPORT_STATUS_UPDATE_FAILED";
    return NextResponse.json({ message, code }, { status });
  }
}
