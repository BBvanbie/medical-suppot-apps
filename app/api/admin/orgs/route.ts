import { NextResponse } from "next/server";

import { listAdminOrgs } from "@/lib/admin/adminManagementRepository";
import { ensureAdminManagementSchema } from "@/lib/admin/adminManagementSchema";
import { getAuthenticatedUser } from "@/lib/authContext";
import { authorizeAdminRoute } from "@/lib/routeAccess";

export async function GET() {
  try {
    const access = authorizeAdminRoute(await getAuthenticatedUser());
    if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });

    await ensureAdminManagementSchema();
    const rows = await listAdminOrgs();
    return NextResponse.json({ rows });
  } catch (error) {
    console.error("GET /api/admin/orgs failed", error);
    return NextResponse.json({ message: "Failed to fetch orgs." }, { status: 500 });
  }
}
