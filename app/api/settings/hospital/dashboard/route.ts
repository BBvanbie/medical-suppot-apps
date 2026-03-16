import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { getHospitalDashboardSettings, updateHospitalDashboardSettings } from "@/lib/hospitalSettingsRepository";
import { ensureHospitalSettingsSchema } from "@/lib/hospitalSettingsSchema";
import { parseHospitalDashboardSettings } from "@/lib/hospitalSettingsValidation";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "HOSPITAL" || !user.hospitalId) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    await ensureHospitalSettingsSchema();
    const settings = await getHospitalDashboardSettings(user.hospitalId);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("GET /api/settings/hospital/dashboard failed", error);
    return NextResponse.json({ message: "Failed to fetch dashboard settings." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "HOSPITAL" || !user.hospitalId) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    await ensureHospitalSettingsSchema();
    const body = (await req.json()) as unknown;
    const parsed = parseHospitalDashboardSettings(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed.", fieldErrors: parsed.fieldErrors }, { status: 400 });
    }

    const settings = await updateHospitalDashboardSettings(user.hospitalId, parsed.data);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("PATCH /api/settings/hospital/dashboard failed", error);
    return NextResponse.json({ message: "Failed to update dashboard settings." }, { status: 500 });
  }
}
