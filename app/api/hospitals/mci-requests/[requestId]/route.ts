import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { respondMciHospitalRequest, type TriageColorCounts } from "@/lib/triageIncidentRepository";

type Params = {
  params: Promise<{ requestId: string }>;
};

type Body = {
  status?: unknown;
  capacities?: unknown;
  notes?: unknown;
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

export async function PATCH(req: Request, { params }: Params) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "HOSPITAL" || !user.hospitalId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { requestId } = await params;
  const id = Number(requestId);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ message: "依頼IDが不正です。" }, { status: 400 });
  }

  const body = ((await req.json().catch(() => ({}))) ?? {}) as Body;
  const status = body.status === "ACCEPTABLE" || body.status === "NOT_ACCEPTABLE" ? body.status : null;
  if (!status) {
    return NextResponse.json({ message: "受入可否を指定してください。" }, { status: 400 });
  }

  try {
    const row = await respondMciHospitalRequest({
      requestId: id,
      hospitalId: user.hospitalId,
      mode: user.currentMode,
      actor: user,
      status,
      capacities: parseCounts(body.capacities),
      notes: typeof body.notes === "string" ? body.notes : "",
    });
    return NextResponse.json({ ok: true, row });
  } catch (error) {
    const message = error instanceof Error ? error.message : "MCI受入依頼への返信に失敗しました。";
    return NextResponse.json({ message }, { status: 400 });
  }
}
