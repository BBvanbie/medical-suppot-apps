import { NextResponse } from "next/server";

import { updateAdminUser } from "@/lib/admin/adminManagementRepository";
import { ensureAdminManagementSchema } from "@/lib/admin/adminManagementSchema";
import { parseAdminUserUpdateInput } from "@/lib/admin/adminManagementValidation";
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
    const parsed = parseAdminUserUpdateInput(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed.", fieldErrors: parsed.fieldErrors }, { status: 400 });
    }

    const row = await updateAdminUser(id, parsed.data, user);
    if (!row) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ row });
  } catch (error) {
    console.error("PATCH /api/admin/users/[id] failed", error);
    return NextResponse.json({ message: "Failed to update user." }, { status: 500 });
  }
}
