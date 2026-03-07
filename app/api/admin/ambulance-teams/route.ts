import { NextResponse } from "next/server";

import { createAdminAmbulanceTeam, listAdminAmbulanceTeams } from "@/lib/admin/adminManagementRepository";
import { ensureAdminManagementSchema } from "@/lib/admin/adminManagementSchema";
import { parseAdminAmbulanceTeamCreateInput } from "@/lib/admin/adminManagementValidation";
import { getAuthenticatedUser } from "@/lib/authContext";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "ADMIN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

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
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "ADMIN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

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
