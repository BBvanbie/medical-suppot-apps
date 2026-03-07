import { NextResponse } from "next/server";

import { listGlobalAdminAuditLogs } from "@/lib/admin/adminManagementRepository";
import { ensureAdminManagementSchema } from "@/lib/admin/adminManagementSchema";
import { getAuthenticatedUser } from "@/lib/authContext";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "ADMIN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const targetType = searchParams.get("targetType")?.trim() || undefined;
    const action = searchParams.get("action")?.trim() || undefined;
    const query = searchParams.get("query")?.trim() || undefined;

    await ensureAdminManagementSchema();
    const logs = await listGlobalAdminAuditLogs({ targetType, action, query });
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("GET /api/admin/logs failed", error);
    return NextResponse.json({ message: "Failed to fetch logs." }, { status: 500 });
  }
}
