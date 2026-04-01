import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authContext";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";
import { listHospitalRequestsForHospital } from "@/lib/hospitalRequestRepository";
import { authorizeHospitalRoute } from "@/lib/routeAccess";

export async function GET() {
  try {
    await ensureHospitalRequestTables();
    const access = authorizeHospitalRoute(await getAuthenticatedUser());
    if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });
    const user = access.user;

    const rows = await listHospitalRequestsForHospital(user.hospitalId);
    return NextResponse.json({ rows });
  } catch (error) {
    console.error("GET /api/hospitals/requests failed", error);
    return NextResponse.json({ message: "受入依頼一覧の取得に失敗しました。" }, { status: 500 });
  }
}
