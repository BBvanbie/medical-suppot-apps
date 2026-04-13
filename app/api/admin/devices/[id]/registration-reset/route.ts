import { NextResponse } from "next/server";

import { resetAdminDeviceRegistration } from "@/lib/admin/adminDevicesRepository";
import { ensureAdminManagementSchema } from "@/lib/admin/adminManagementSchema";
import { getAuthenticatedUser } from "@/lib/authContext";
import { authorizeAdminRoute } from "@/lib/routeAccess";

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const access = authorizeAdminRoute(await getAuthenticatedUser());
    if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });

    const params = await context.params;
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ message: "Invalid id." }, { status: 400 });
    }

    await ensureAdminManagementSchema();
    const row = await resetAdminDeviceRegistration(id, access.user);
    if (!row) {
      return NextResponse.json({ message: "Device not found." }, { status: 404 });
    }

    return NextResponse.json({ row });
  } catch (error) {
    console.error("POST /api/admin/devices/[id]/registration-reset failed", error);
    return NextResponse.json({ message: "Failed to reset device registration." }, { status: 500 });
  }
}
