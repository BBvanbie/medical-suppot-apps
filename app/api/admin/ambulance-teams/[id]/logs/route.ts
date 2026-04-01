import { NextResponse } from "next/server";

import { listAdminAuditLogs } from "@/lib/admin/adminManagementRepository";
import { ensureAdminManagementSchema } from "@/lib/admin/adminManagementSchema";
import { getAuthenticatedUser } from "@/lib/authContext";
import { authorizeAdminRoute } from "@/lib/routeAccess";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const access = authorizeAdminRoute(await getAuthenticatedUser());
    if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });

    const params = await context.params;
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ message: "Invalid id." }, { status: 400 });
    }

    await ensureAdminManagementSchema();
    const logs = await listAdminAuditLogs("ambulance_team", id);
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("GET /api/admin/ambulance-teams/[id]/logs failed", error);
    return NextResponse.json({ message: "Failed to fetch ambulance team logs." }, { status: 500 });
  }
}
