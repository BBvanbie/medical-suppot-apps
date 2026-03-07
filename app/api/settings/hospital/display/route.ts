import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { getHospitalDisplaySettings, updateHospitalDisplaySettings } from "@/lib/hospitalSettingsRepository";
import { ensureHospitalSettingsSchema } from "@/lib/hospitalSettingsSchema";
import { parseHospitalDisplaySettings } from "@/lib/hospitalSettingsValidation";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "HOSPITAL" || !user.hospitalId) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    await ensureHospitalSettingsSchema();
    const settings = await getHospitalDisplaySettings(user.hospitalId);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("GET /api/settings/hospital/display failed", error);
    return NextResponse.json({ message: "Failed to fetch display settings." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "HOSPITAL" || !user.hospitalId) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    await ensureHospitalSettingsSchema();
    const body = (await req.json()) as unknown;
    const parsed = parseHospitalDisplaySettings(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed.", fieldErrors: parsed.fieldErrors }, { status: 400 });
    }

    const settings = await updateHospitalDisplaySettings(user.hospitalId, parsed.data);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("PATCH /api/settings/hospital/display failed", error);
    return NextResponse.json({ message: "Failed to update display settings." }, { status: 500 });
  }
}
