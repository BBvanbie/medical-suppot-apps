import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { closeMciIncident, MciWorkflowError } from "@/lib/triageIncidentRepository";

type Params = {
  params: Promise<{ incidentId: string }>;
};

type Body = {
  closureType?: unknown;
  reason?: unknown;
};

function parseIncidentId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function POST(req: Request, { params }: Params) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "DISPATCH" && user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { incidentId } = await params;
  const id = parseIncidentId(incidentId);
  if (!id) return NextResponse.json({ message: "インシデントIDが不正です。", code: "INVALID_INCIDENT_ID" }, { status: 400 });

  const body = ((await req.json().catch(() => ({}))) ?? {}) as Body;
  const closureType = body.closureType === "FORCED" ? "FORCED" : "NORMAL";

  try {
    const result = await closeMciIncident({
      incidentId: id,
      mode: user.currentMode,
      actor: user,
      closureType,
      reason: typeof body.reason === "string" ? body.reason : "",
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "MCIインシデント終了に失敗しました。";
    const status = error instanceof MciWorkflowError ? error.status : 400;
    const code = error instanceof MciWorkflowError ? error.code : "MCI_INCIDENT_CLOSE_FAILED";
    return NextResponse.json({ message, code }, { status });
  }
}
