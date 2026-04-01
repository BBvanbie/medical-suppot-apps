import { NextResponse } from "next/server";

import {
  ensureDefaultAdminDevicesSeeded,
  listAdminDeviceHospitalOptions,
  listAdminDevices,
  listAdminDeviceTeamOptions,
} from "@/lib/admin/adminDevicesRepository";
import { ensureAdminManagementSchema } from "@/lib/admin/adminManagementSchema";
import { getAuthenticatedUser } from "@/lib/authContext";
import { authorizeAdminRoute } from "@/lib/routeAccess";

export async function GET() {
  try {
    const access = authorizeAdminRoute(await getAuthenticatedUser());
    if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });

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
