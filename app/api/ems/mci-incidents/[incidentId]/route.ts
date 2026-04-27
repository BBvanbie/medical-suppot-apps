import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { getMciIncidentWorkspaceForTeam, updateMciIncidentParticipation } from "@/lib/triageIncidentRepository";

type Params = {
  params: Promise<{ incidentId: string }>;
};

type PatchBody = {
  participationStatus?: unknown;
};

function parseIncidentId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isParticipationStatus(value: unknown): value is "JOINED" | "ARRIVED" | "AVAILABLE" | "LEFT" {
  return value === "JOINED" || value === "ARRIVED" || value === "AVAILABLE" || value === "LEFT";
}

export async function GET(_: Request, { params }: Params) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "EMS" || !user.teamId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { incidentId } = await params;
  const id = parseIncidentId(incidentId);
  if (!id) return NextResponse.json({ message: "インシデントIDが不正です。" }, { status: 400 });

  try {
    const workspace = await getMciIncidentWorkspaceForTeam({
      incidentId: id,
      teamId: user.teamId,
      mode: user.currentMode,
    });
    return NextResponse.json({ ...workspace, selfTeamId: user.teamId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "MCIインシデント情報の取得に失敗しました。";
    return NextResponse.json({ message }, { status: 404 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "EMS" || !user.teamId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { incidentId } = await params;
  const id = parseIncidentId(incidentId);
  if (!id) return NextResponse.json({ message: "インシデントIDが不正です。" }, { status: 400 });

  const body = ((await req.json().catch(() => ({}))) ?? {}) as PatchBody;
  if (!isParticipationStatus(body.participationStatus)) {
    return NextResponse.json({ message: "参加状態が不正です。" }, { status: 400 });
  }

  try {
    await updateMciIncidentParticipation({
      incidentId: id,
      teamId: user.teamId,
      mode: user.currentMode,
      status: body.participationStatus,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "参加状態の更新に失敗しました。";
    return NextResponse.json({ message }, { status: 400 });
  }
}
