import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { MciWorkflowError, reviewMciProvisionalPatient } from "@/lib/triageIncidentRepository";

type Params = {
  params: Promise<{ incidentId: string; patientId: string }>;
};

type Body = {
  action?: unknown;
  mergeIntoPatientId?: unknown;
  reason?: unknown;
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
  const action = body.action === "APPROVE" || body.action === "MERGE" || body.action === "RETURN" ? body.action : null;
  if (!action) {
    return NextResponse.json({ message: "レビュー操作を指定してください。", code: "INVALID_REVIEW_ACTION" }, { status: 400 });
  }

  try {
    const patient = await reviewMciProvisionalPatient({
      incidentId: parsedIncidentId,
      patientId: parsedPatientId,
      teamId: user.teamId,
      mode: user.currentMode,
      actorUserId: user.id,
      action,
      mergeIntoPatientId: Number.isInteger(Number(body.mergeIntoPatientId)) ? Number(body.mergeIntoPatientId) : null,
      reason: typeof body.reason === "string" ? body.reason : "",
    });
    return NextResponse.json({ ok: true, patient });
  } catch (error) {
    const message = error instanceof Error ? error.message : "仮登録傷病者のレビューに失敗しました。";
    const status = error instanceof MciWorkflowError ? error.status : 400;
    const code = error instanceof MciWorkflowError ? error.code : "MCI_PROVISIONAL_PATIENT_REVIEW_FAILED";
    return NextResponse.json({ message, code }, { status });
  }
}
