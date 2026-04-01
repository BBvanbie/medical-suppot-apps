import { NextResponse } from "next/server";

import { ensureAdminManagementSchema } from "@/lib/admin/adminManagementSchema";
import { updateAdminAmbulanceTeam } from "@/lib/admin/adminManagementRepository";
import { parseAdminAmbulanceTeamUpdateInput } from "@/lib/admin/adminManagementValidation";
import { getAuthenticatedUser } from "@/lib/authContext";
import { authorizeAdminRoute } from "@/lib/routeAccess";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const access = authorizeAdminRoute(await getAuthenticatedUser());
    if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });
    const user = access.user;

    const params = await context.params;
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ message: "Invalid id." }, { status: 400 });
    }

    await ensureAdminManagementSchema();
    const body = (await req.json()) as unknown;
    const parsed = parseAdminAmbulanceTeamUpdateInput(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed.", fieldErrors: parsed.fieldErrors }, { status: 400 });
    }

    const row = await updateAdminAmbulanceTeam(id, parsed.data, user);
    if (!row) {
      return NextResponse.json({ message: "Ambulance team not found." }, { status: 404 });
    }

    return NextResponse.json({ row });
  } catch (error) {
    console.error("PATCH /api/admin/ambulance-teams/[id] failed", error);
    return NextResponse.json({ message: "Failed to update ambulance team." }, { status: 500 });
  }
}
