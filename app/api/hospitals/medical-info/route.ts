import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { listHospitalDepartmentAvailability } from "@/lib/hospitalDepartmentAvailabilityRepository";
import { authorizeHospitalRoute } from "@/lib/routeAccess";

export async function GET() {
  try {
    const access = authorizeHospitalRoute(await getAuthenticatedUser());
    if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });
    const user = access.user;

    const items = await listHospitalDepartmentAvailability(user.hospitalId);

    return NextResponse.json({
      hospitalId: String(user.hospitalId),
      items: items.map((item) => ({
        departmentId: String(item.departmentId),
        departmentName: item.departmentName,
        departmentShortName: item.departmentShortName,
        isAvailable: item.isAvailable,
        updatedAt: item.updatedAt,
      })),
    });
  } catch (error) {
    console.error("GET /api/hospitals/medical-info failed", error);
    return NextResponse.json({ message: "Failed to load medical info." }, { status: 500 });
  }
}
