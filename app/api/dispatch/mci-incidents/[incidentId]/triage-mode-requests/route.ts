import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { requestTriageModeForIncidentTeams } from "@/lib/triageIncidentRepository";

type Params = {
  params: Promise<{ incidentId: string }>;
};

type PostBody = {
  teamIds?: unknown;
};

function parseTeamIds(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const teamIds = Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0),
    ),
  );
  return teamIds.length > 0 ? teamIds : undefined;
}

export async function POST(req: Request, { params }: Params) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "DISPATCH" && user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { incidentId } = await params;
  const numericIncidentId = Number(incidentId);
  if (!Number.isInteger(numericIncidentId) || numericIncidentId < 1) {
    return NextResponse.json({ message: "インシデントIDが不正です。" }, { status: 400 });
  }

  const body = ((await req.json().catch(() => ({}))) ?? {}) as PostBody;
  try {
    const result = await requestTriageModeForIncidentTeams({
      incidentId: numericIncidentId,
      mode: user.currentMode,
      actor: user,
      teamIds: parseTeamIds(body.teamIds),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("POST /api/dispatch/mci-incidents/[incidentId]/triage-mode-requests failed", error);
    return NextResponse.json({ message: "TRIAGE切替依頼の送信に失敗しました。" }, { status: 500 });
  }
}
