import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { createMciTransportAssignment, MciWorkflowError } from "@/lib/triageIncidentRepository";

type Params = {
  params: Promise<{ incidentId: string }>;
};

type Body = {
  targetTeamId?: unknown;
  hospitalOfferId?: unknown;
  patientIds?: unknown;
};

function parseIncidentId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0)));
}

export async function POST(req: Request, { params }: Params) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "EMS" || !user.teamId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { incidentId } = await params;
  const id = parseIncidentId(incidentId);
  if (!id) return NextResponse.json({ message: "インシデントIDが不正です。" }, { status: 400 });

  const body = ((await req.json().catch(() => ({}))) ?? {}) as Body;
  const targetTeamId = Number(body.targetTeamId);
  const hospitalOfferId = Number(body.hospitalOfferId);
  if (!Number.isInteger(targetTeamId) || targetTeamId < 1) {
    return NextResponse.json({ message: "搬送隊を選択してください。" }, { status: 400 });
  }
  if (!Number.isInteger(hospitalOfferId) || hospitalOfferId < 1) {
    return NextResponse.json({ message: "受入可能病院枠を選択してください。" }, { status: 400 });
  }

  try {
    const assignment = await createMciTransportAssignment({
      incidentId: id,
      teamId: user.teamId,
      mode: user.currentMode,
      targetTeamId,
      hospitalOfferId,
      patientIds: parseIds(body.patientIds),
    });
    return NextResponse.json({ ok: true, assignment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "MCI搬送割当の送信に失敗しました。";
    const status = error instanceof MciWorkflowError ? error.status : 400;
    const code = error instanceof MciWorkflowError ? error.code : "MCI_ASSIGNMENT_CREATE_FAILED";
    return NextResponse.json({ message, code }, { status });
  }
}
