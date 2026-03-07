import { NextResponse } from "next/server";

import { listAdminHospitalOptions, listAdminTeamOptions, listAdminUsers } from "@/lib/admin/adminManagementRepository";
import { ensureAdminManagementSchema } from "@/lib/admin/adminManagementSchema";
import { getAuthenticatedUser } from "@/lib/authContext";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "ADMIN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    await ensureAdminManagementSchema();
    const [rows, teamOptions, hospitalOptions] = await Promise.all([
      listAdminUsers(),
      listAdminTeamOptions(),
      listAdminHospitalOptions(),
    ]);
    return NextResponse.json({ rows, teamOptions, hospitalOptions });
  } catch (error) {
    console.error("GET /api/admin/users failed", error);
    return NextResponse.json({ message: "Failed to fetch users." }, { status: 500 });
  }
}
