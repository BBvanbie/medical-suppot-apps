import { NextResponse } from "next/server";

import { listAdminOrgs } from "@/lib/admin/adminManagementRepository";
import { ensureAdminManagementSchema } from "@/lib/admin/adminManagementSchema";
import { getAuthenticatedUser } from "@/lib/authContext";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "ADMIN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    await ensureAdminManagementSchema();
    const rows = await listAdminOrgs();
    return NextResponse.json({ rows });
  } catch (error) {
    console.error("GET /api/admin/orgs failed", error);
    return NextResponse.json({ message: "Failed to fetch orgs." }, { status: 500 });
  }
}
