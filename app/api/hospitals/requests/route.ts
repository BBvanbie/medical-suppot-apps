import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authContext";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";
import { listHospitalRequestsForHospital } from "@/lib/hospitalRequestRepository";

export async function GET() {
  try {
    await ensureHospitalRequestTables();
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "HOSPITAL" || !user.hospitalId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const rows = await listHospitalRequestsForHospital(user.hospitalId);
    return NextResponse.json({ rows });
  } catch (error) {
    console.error("GET /api/hospitals/requests failed", error);
    return NextResponse.json({ message: "受入依頼一覧の取得に失敗しました。" }, { status: 500 });
  }
}
