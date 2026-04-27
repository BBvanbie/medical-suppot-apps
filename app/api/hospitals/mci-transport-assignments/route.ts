import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { listMciTransportAssignmentsForHospital } from "@/lib/triageIncidentRepository";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "HOSPITAL" || !user.hospitalId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const rows = await listMciTransportAssignmentsForHospital(user.hospitalId, user.currentMode);
    return NextResponse.json({ rows });
  } catch (error) {
    console.error("GET /api/hospitals/mci-transport-assignments failed", error);
    return NextResponse.json({ message: "MCI搬送決定一覧の取得に失敗しました。" }, { status: 500 });
  }
}
