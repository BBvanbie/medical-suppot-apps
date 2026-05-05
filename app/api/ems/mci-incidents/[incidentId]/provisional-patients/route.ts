import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { createMciProvisionalPatient, MciWorkflowError } from "@/lib/triageIncidentRepository";

type Params = {
  params: Promise<{ incidentId: string }>;
};

type Body = {
  currentTag?: unknown;
  startTag?: unknown;
  patTag?: unknown;
  injuryDetails?: unknown;
};

function parseIncidentId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function POST(req: Request, { params }: Params) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "EMS" || !user.teamId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { incidentId } = await params;
  const id = parseIncidentId(incidentId);
  if (!id) return NextResponse.json({ message: "インシデントIDが不正です。", code: "INVALID_INCIDENT_ID" }, { status: 400 });

  const body = ((await req.json().catch(() => ({}))) ?? {}) as Body;
  try {
    const patient = await createMciProvisionalPatient({
      incidentId: id,
      teamId: user.teamId,
      mode: user.currentMode,
      actorUserId: user.id,
      currentTag: body.currentTag,
      startTag: body.startTag,
      patTag: body.patTag,
      injuryDetails: typeof body.injuryDetails === "string" ? body.injuryDetails : "",
    });
    return NextResponse.json({ ok: true, patient });
  } catch (error) {
    const message = error instanceof Error ? error.message : "仮登録傷病者の作成に失敗しました。";
    const status = error instanceof MciWorkflowError ? error.status : 400;
    const code = error instanceof MciWorkflowError ? error.code : "MCI_PROVISIONAL_PATIENT_CREATE_FAILED";
    return NextResponse.json({ message, code }, { status });
  }
}
