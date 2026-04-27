import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import {
  approveMciIncidentFromCase,
  getMciIncidentBySourceCase,
  listMciIncidentCandidatesForCase,
  type TriageColorCounts,
} from "@/lib/triageIncidentRepository";

type Params = {
  params: Promise<{ caseId: string }>;
};

type PostBody = {
  summary?: unknown;
  notes?: unknown;
  startCounts?: unknown;
  patCounts?: unknown;
  commandTeamId?: unknown;
  selectedTeamIds?: unknown;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function toCount(value: unknown) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return 0;
  return Math.max(0, Math.min(9999, Math.trunc(numberValue)));
}

function parseCounts(value: unknown): TriageColorCounts {
  const object = asObject(value);
  return {
    red: toCount(object.red),
    yellow: toCount(object.yellow),
    green: toCount(object.green),
    black: toCount(object.black),
  };
}

function parseTeamIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0),
    ),
  );
}

export async function GET(_: Request, { params }: Params) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "DISPATCH" && user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { caseId } = await params;
  try {
    const [incident, candidates] = await Promise.all([
      getMciIncidentBySourceCase(caseId, user.currentMode),
      listMciIncidentCandidatesForCase(caseId, user.currentMode),
    ]);
    return NextResponse.json({ incident, candidates });
  } catch (error) {
    console.error("GET /api/dispatch/cases/[caseId]/mci-incident failed", error);
    return NextResponse.json({ message: "MCIインシデント情報の取得に失敗しました。" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: Params) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "DISPATCH" && user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { caseId } = await params;
  const body = ((await req.json().catch(() => ({}))) ?? {}) as PostBody;
  const summary = String(body.summary ?? "").trim();
  const notes = String(body.notes ?? "").trim();
  const commandTeamId = Number(body.commandTeamId);
  const selectedTeamIds = parseTeamIds(body.selectedTeamIds);

  if (!summary) {
    return NextResponse.json({ message: "災害概要を入力してください。" }, { status: 400 });
  }
  if (!Number.isInteger(commandTeamId) || commandTeamId < 1) {
    return NextResponse.json({ message: "統括救急隊を選択してください。" }, { status: 400 });
  }

  try {
    const incident = await approveMciIncidentFromCase({
      caseId,
      mode: user.currentMode,
      actor: user,
      summary,
      notes,
      startCounts: parseCounts(body.startCounts),
      patCounts: parseCounts(body.patCounts),
      commandTeamId,
      selectedTeamIds,
    });
    return NextResponse.json({ ok: true, incident });
  } catch (error) {
    const message = error instanceof Error ? error.message : "MCIインシデント化に失敗しました。";
    const status = message.includes("見つかりません") ? 404 : 400;
    return NextResponse.json({ message }, { status });
  }
}
