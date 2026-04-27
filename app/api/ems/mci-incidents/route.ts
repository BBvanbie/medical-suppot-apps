import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { listMciIncidentsForTeam } from "@/lib/triageIncidentRepository";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "EMS" || !user.teamId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const rows = await listMciIncidentsForTeam(user.teamId, user.currentMode);
    return NextResponse.json({ rows });
  } catch (error) {
    console.error("GET /api/ems/mci-incidents failed", error);
    return NextResponse.json({ message: "MCIインシデント一覧の取得に失敗しました。" }, { status: 500 });
  }
}
