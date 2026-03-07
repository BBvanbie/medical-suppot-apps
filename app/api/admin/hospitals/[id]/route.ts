import { NextResponse } from "next/server";

import { ensureAdminManagementSchema } from "@/lib/admin/adminManagementSchema";
import { parseAdminHospitalUpdateInput } from "@/lib/admin/adminManagementValidation";
import { updateAdminHospital } from "@/lib/admin/adminManagementRepository";
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
    const parsed = parseAdminHospitalUpdateInput(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed.", fieldErrors: parsed.fieldErrors }, { status: 400 });
    }

    const row = await updateAdminHospital(id, parsed.data, user);
    if (!row) {
      return NextResponse.json({ message: "Hospital not found." }, { status: 404 });
    }

    return NextResponse.json({ row });
  } catch (error) {
    console.error("PATCH /api/admin/hospitals/[id] failed", error);
    return NextResponse.json({ message: "Failed to update hospital." }, { status: 500 });
  }
}
