import { NextResponse } from "next/server";

import { createAdminHospital, listAdminHospitals } from "@/lib/admin/adminManagementRepository";
import { ensureAdminManagementSchema } from "@/lib/admin/adminManagementSchema";
import { parseAdminHospitalCreateInput } from "@/lib/admin/adminManagementValidation";
import { getAuthenticatedUser } from "@/lib/authContext";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "ADMIN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    await ensureAdminManagementSchema();
    const rows = await listAdminHospitals();
    return NextResponse.json({ rows });
  } catch (error) {
    console.error("GET /api/admin/hospitals failed", error);
    return NextResponse.json({ message: "Failed to fetch hospitals." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "ADMIN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    await ensureAdminManagementSchema();
    const body = (await req.json()) as unknown;
    const parsed = parseAdminHospitalCreateInput(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed.", fieldErrors: parsed.fieldErrors }, { status: 400 });
    }

    const row = await createAdminHospital(parsed.data, user);
    if (!row) {
      return NextResponse.json(
        { message: "Hospital code already exists.", fieldErrors: { sourceNo: "この施設コードは既に登録されています。" } },
        { status: 409 },
      );
    }

    return NextResponse.json({ row }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/hospitals failed", error);
    return NextResponse.json({ message: "Failed to create hospital." }, { status: 500 });
  }
}
