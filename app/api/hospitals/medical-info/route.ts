import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { listHospitalDepartmentAvailability } from "@/lib/hospitalDepartmentAvailabilityRepository";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "HOSPITAL" || !user.hospitalId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

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
