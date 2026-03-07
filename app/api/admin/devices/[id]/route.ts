import { NextResponse } from "next/server";

import { updateAdminDevice } from "@/lib/admin/adminDevicesRepository";
import { ensureAdminManagementSchema } from "@/lib/admin/adminManagementSchema";
import { parseAdminDeviceUpdateInput } from "@/lib/admin/adminDevicesValidation";
import { getAuthenticatedUser } from "@/lib/authContext";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
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
    const body = (await req.json()) as unknown;
    const parsed = parseAdminDeviceUpdateInput(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed.", fieldErrors: parsed.fieldErrors }, { status: 400 });
    }

    const row = await updateAdminDevice(id, parsed.data, user);
    if (!row) {
      return NextResponse.json({ message: "Device not found." }, { status: 404 });
    }

    return NextResponse.json({ row });
  } catch (error) {
    console.error("PATCH /api/admin/devices/[id] failed", error);
    return NextResponse.json({ message: "Failed to update device." }, { status: 500 });
  }
}
