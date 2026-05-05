import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { MciWorkflowError, transitionMciCommander } from "@/lib/triageIncidentRepository";

type Params = {
  params: Promise<{ incidentId: string }>;
};

type Body = {
  toTeamId?: unknown;
  reason?: unknown;
};

function parseIncidentId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function POST(req: Request, { params }: Params) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "DISPATCH") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { incidentId } = await params;
  const id = parseIncidentId(incidentId);
  if (!id) return NextResponse.json({ message: "インシデントIDが不正です。", code: "INVALID_INCIDENT_ID" }, { status: 400 });

  const body = ((await req.json().catch(() => ({}))) ?? {}) as Body;
  const toTeamId = Number(body.toTeamId);
  if (!Number.isInteger(toTeamId) || toTeamId < 1) {
    return NextResponse.json({ message: "新しい統括救急隊を指定してください。", code: "COMMAND_TEAM_REQUIRED" }, { status: 400 });
  }

  try {
    const incident = await transitionMciCommander({
      incidentId: id,
      mode: user.currentMode,
      actor: user,
      toTeamId,
      reason: typeof body.reason === "string" ? body.reason : "",
    });
    return NextResponse.json({ ok: true, incident });
  } catch (error) {
    const message = error instanceof Error ? error.message : "統括救急隊交代に失敗しました。";
    const status = error instanceof MciWorkflowError ? error.status : 400;
    const code = error instanceof MciWorkflowError ? error.code : "MCI_COMMAND_TRANSITION_FAILED";
    return NextResponse.json({ message, code }, { status });
  }
}
