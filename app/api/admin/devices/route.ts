import { NextResponse } from "next/server";

import {
  ensureDefaultAdminDevicesSeeded,
  listAdminDeviceHospitalOptions,
  listAdminDevices,
  listAdminDeviceTeamOptions,
} from "@/lib/admin/adminDevicesRepository";
import { ensureAdminManagementSchema } from "@/lib/admin/adminManagementSchema";
import { getAuthenticatedUser } from "@/lib/authContext";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "ADMIN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    await ensureAdminManagementSchema();
    await ensureDefaultAdminDevicesSeeded();
    const [rows, teamOptions, hospitalOptions] = await Promise.all([
      listAdminDevices(),
      listAdminDeviceTeamOptions(),
      listAdminDeviceHospitalOptions(),
    ]);
    return NextResponse.json({ rows, teamOptions, hospitalOptions });
  } catch (error) {
    console.error("GET /api/admin/devices failed", error);
    return NextResponse.json({ message: "Failed to fetch devices." }, { status: 500 });
  }
}
