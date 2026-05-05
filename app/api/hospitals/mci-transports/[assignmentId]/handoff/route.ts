import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { completeMciTransportHandoff, MciWorkflowError } from "@/lib/triageIncidentRepository";

type Params = {
  params: Promise<{ assignmentId: string }>;
};

function parseAssignmentId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(_: Request, { params }: Params) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "HOSPITAL" || !user.hospitalId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { assignmentId } = await params;
  const id = parseAssignmentId(assignmentId);
  if (!id) return NextResponse.json({ message: "搬送割当IDが不正です。", code: "INVALID_ASSIGNMENT_ID" }, { status: 400 });

  try {
    const assignment = await completeMciTransportHandoff({
      assignmentId: id,
      hospitalId: user.hospitalId,
      mode: user.currentMode,
      actorUserId: user.id,
    });
    return NextResponse.json({ ok: true, assignment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "MCI引継完了に失敗しました。";
    const status = error instanceof MciWorkflowError ? error.status : 400;
    const code = error instanceof MciWorkflowError ? error.code : "MCI_HANDOFF_FAILED";
    return NextResponse.json({ message, code }, { status });
  }
}
