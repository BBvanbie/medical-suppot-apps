import { NextResponse } from "next/server";

import { createAdminAmbulanceTeam, listAdminAmbulanceTeams } from "@/lib/admin/adminManagementRepository";
import { ensureAdminManagementSchema } from "@/lib/admin/adminManagementSchema";
import { parseAdminAmbulanceTeamCreateInput } from "@/lib/admin/adminManagementValidation";
import { getAuthenticatedUser } from "@/lib/authContext";
import { authorizeAdminRoute } from "@/lib/routeAccess";

export async function GET() {
  try {
    const access = authorizeAdminRoute(await getAuthenticatedUser());
    if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });

    await ensureAdminManagementSchema();
    const rows = await listAdminAmbulanceTeams();
    return NextResponse.json({ rows });
  } catch (error) {
    console.error("GET /api/admin/ambulance-teams failed", error);
    return NextResponse.json({ message: "Failed to fetch ambulance teams." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const access = authorizeAdminRoute(await getAuthenticatedUser());
    if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });
    const user = access.user;

    await ensureAdminManagementSchema();
    const body = (await req.json()) as unknown;
    const parsed = parseAdminAmbulanceTeamCreateInput(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed.", fieldErrors: parsed.fieldErrors }, { status: 400 });
    }

    const row = await createAdminAmbulanceTeam(parsed.data, user);
    if (!row) {
      return NextResponse.json(
        { message: "Team code already exists.", fieldErrors: { teamCode: "この隊コードは既に登録されています。" } },
        { status: 409 },
      );
    }

    return NextResponse.json({ row }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/ambulance-teams failed", error);
    return NextResponse.json({ message: "Failed to create ambulance team." }, { status: 500 });
  }
}
