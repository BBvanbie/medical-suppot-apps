import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { MciWorkflowError, updateMciPatientTag } from "@/lib/triageIncidentRepository";

type Params = {
  params: Promise<{ incidentId: string; patientId: string }>;
};

type Body = {
  toTag?: unknown;
  reason?: unknown;
  source?: unknown;
};

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function POST(req: Request, { params }: Params) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "EMS" || !user.teamId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { incidentId, patientId } = await params;
  const parsedIncidentId = parseId(incidentId);
  const parsedPatientId = parseId(patientId);
  if (!parsedIncidentId || !parsedPatientId) {
    return NextResponse.json({ message: "IDが不正です。", code: "INVALID_ID" }, { status: 400 });
  }

  const body = ((await req.json().catch(() => ({}))) ?? {}) as Body;
  const source = body.source === "START" || body.source === "PAT" || body.source === "REVIEW" ? body.source : "MANUAL_OVERRIDE";

  try {
    const patient = await updateMciPatientTag({
      incidentId: parsedIncidentId,
      patientId: parsedPatientId,
      teamId: user.teamId,
      mode: user.currentMode,
      actorUserId: user.id,
      toTag: body.toTag,
      reason: typeof body.reason === "string" ? body.reason : "",
      source,
    });
    return NextResponse.json({ ok: true, patient });
  } catch (error) {
    const message = error instanceof Error ? error.message : "傷病者タグ変更に失敗しました。";
    const status = error instanceof MciWorkflowError ? error.status : 400;
    const code = error instanceof MciWorkflowError ? error.code : "MCI_PATIENT_TAG_UPDATE_FAILED";
    return NextResponse.json({ message, code }, { status });
  }
}
