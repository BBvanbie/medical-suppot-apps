import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { decideMciTransportAssignment } from "@/lib/triageIncidentRepository";

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
  if (user.role !== "EMS" || !user.teamId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { assignmentId } = await params;
  const id = parseAssignmentId(assignmentId);
  if (!id) return NextResponse.json({ message: "搬送割当IDが不正です。" }, { status: 400 });

  try {
    const assignment = await decideMciTransportAssignment({
      assignmentId: id,
      teamId: user.teamId,
      mode: user.currentMode,
    });
    return NextResponse.json({ ok: true, assignment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "MCI搬送決定に失敗しました。";
    return NextResponse.json({ message }, { status: 400 });
  }
}
