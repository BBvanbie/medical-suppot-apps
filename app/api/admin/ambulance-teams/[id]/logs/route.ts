import { NextResponse } from "next/server";

import { listAdminAuditLogs } from "@/lib/admin/adminManagementRepository";
import { ensureAdminManagementSchema } from "@/lib/admin/adminManagementSchema";
import { getAuthenticatedUser } from "@/lib/authContext";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "ADMIN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

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
