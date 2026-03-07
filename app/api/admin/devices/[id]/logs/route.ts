import { NextResponse } from "next/server";

import { listAdminDeviceLogs } from "@/lib/admin/adminDevicesRepository";
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
    const logs = await listAdminDeviceLogs(id);
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("GET /api/admin/devices/[id]/logs failed", error);
    return NextResponse.json({ message: "Failed to fetch device logs." }, { status: 500 });
  }
}
