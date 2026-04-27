import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { listMciHospitalRequestsForHospital } from "@/lib/triageIncidentRepository";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "HOSPITAL" || !user.hospitalId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const rows = await listMciHospitalRequestsForHospital(user.hospitalId, user.currentMode);
    return NextResponse.json({ rows });
  } catch (error) {
    console.error("GET /api/hospitals/mci-requests failed", error);
    return NextResponse.json({ message: "MCI受入依頼一覧の取得に失敗しました。" }, { status: 500 });
  }
}
