import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { updateHospitalDepartmentAvailability } from "@/lib/hospitalDepartmentAvailabilityRepository";

type Params = {
  params: Promise<{ departmentId: string }>;
};

type Body = {
  isAvailable?: unknown;
};

export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "HOSPITAL" || !user.hospitalId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { departmentId: rawDepartmentId } = await params;
    const departmentId = Number(rawDepartmentId);
    if (!Number.isFinite(departmentId)) {
      return NextResponse.json({ message: "Invalid departmentId" }, { status: 400 });
    }

    const body = (await req.json()) as Body;
    if (typeof body.isAvailable !== "boolean") {
      return NextResponse.json({ message: "isAvailable must be boolean." }, { status: 400 });
    }

    const item = await updateHospitalDepartmentAvailability({
      hospitalId: user.hospitalId,
      departmentId,
      isAvailable: body.isAvailable,
    });

    return NextResponse.json({
      departmentId: String(item.departmentId),
      departmentName: item.departmentName,
      departmentShortName: item.departmentShortName,
      isAvailable: item.isAvailable,
      updatedAt: item.updatedAt,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "DEPARTMENT_NOT_FOUND") {
      return NextResponse.json({ message: "Department not found." }, { status: 404 });
    }
    console.error("PATCH /api/hospitals/medical-info/[departmentId] failed", error);
    return NextResponse.json({ message: "Failed to update medical info." }, { status: 500 });
  }
}
