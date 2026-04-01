import { NextResponse } from "next/server";

import { listAdminHospitalOptions, listAdminTeamOptions, listAdminUsers } from "@/lib/admin/adminManagementRepository";
import { ensureAdminManagementSchema } from "@/lib/admin/adminManagementSchema";
import { getAuthenticatedUser } from "@/lib/authContext";
import { authorizeAdminRoute } from "@/lib/routeAccess";

export async function GET() {
  try {
    const access = authorizeAdminRoute(await getAuthenticatedUser());
    if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });

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
