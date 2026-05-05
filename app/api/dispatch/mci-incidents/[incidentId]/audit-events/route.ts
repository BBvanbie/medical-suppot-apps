import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { listMciAuditEvents } from "@/lib/triageIncidentRepository";

type Params = {
  params: Promise<{ incidentId: string }>;
};

function parseIncidentId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(req: Request, { params }: Params) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "DISPATCH" && user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { incidentId } = await params;
  const id = parseIncidentId(incidentId);
  if (!id) return NextResponse.json({ message: "インシデントIDが不正です。", code: "INVALID_INCIDENT_ID" }, { status: 400 });

  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? 100);
  try {
    const rows = await listMciAuditEvents({ incidentId: id, mode: user.currentMode, limit });
    return NextResponse.json({ rows });
  } catch (error) {
    console.error("GET /api/dispatch/mci-incidents/[incidentId]/audit-events failed", error);
    return NextResponse.json({ message: "MCI監査ログの取得に失敗しました。", code: "MCI_AUDIT_LIST_FAILED" }, { status: 500 });
  }
}
