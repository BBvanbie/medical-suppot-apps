import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import {
  listMciHospitalRequestsForDispatch,
  sendMciHospitalRequests,
} from "@/lib/triageIncidentRepository";

type Params = {
  params: Promise<{ incidentId: string }>;
};

type HospitalInput = {
  hospitalId?: unknown;
  hospitalName?: unknown;
};

type PostBody = {
  hospitals?: unknown;
};

function normalizeHospitals(value: unknown): HospitalInput[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is HospitalInput => Boolean(item) && typeof item === "object" && !Array.isArray(item));
}

function parseIncidentId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_: Request, { params }: Params) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "DISPATCH" && user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { incidentId } = await params;
  const id = parseIncidentId(incidentId);
  if (!id) return NextResponse.json({ message: "インシデントIDが不正です。" }, { status: 400 });

  try {
    const rows = await listMciHospitalRequestsForDispatch(id, user.currentMode);
    return NextResponse.json({ rows });
  } catch (error) {
    console.error("GET /api/dispatch/mci-incidents/[incidentId]/hospital-requests failed", error);
    return NextResponse.json({ message: "MCI受入依頼一覧の取得に失敗しました。" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: Params) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "DISPATCH" && user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { incidentId } = await params;
  const id = parseIncidentId(incidentId);
  if (!id) return NextResponse.json({ message: "インシデントIDが不正です。" }, { status: 400 });

  const body = ((await req.json().catch(() => ({}))) ?? {}) as PostBody;
  const hospitals = normalizeHospitals(body.hospitals);
  if (hospitals.length === 0) {
    return NextResponse.json({ message: "依頼先病院を選択してください。" }, { status: 400 });
  }

  try {
    const rows = await sendMciHospitalRequests({
      incidentId: id,
      mode: user.currentMode,
      actor: user,
      hospitals,
    });
    return NextResponse.json({ ok: true, rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "MCI受入依頼の送信に失敗しました。";
    return NextResponse.json({ message }, { status: 400 });
  }
}
