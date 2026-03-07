import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { getHospitalFacilitySettings, updateHospitalFacilitySettings } from "@/lib/hospitalSettingsRepository";
import { ensureHospitalSettingsSchema } from "@/lib/hospitalSettingsSchema";
import { parseHospitalFacilitySettings } from "@/lib/hospitalSettingsValidation";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "HOSPITAL" || !user.hospitalId) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    await ensureHospitalSettingsSchema();
    const settings = await getHospitalFacilitySettings(user.hospitalId);
    if (!settings) {
      return NextResponse.json({ message: "Hospital facility settings not found." }, { status: 404 });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("GET /api/settings/hospital/facility failed", error);
    return NextResponse.json({ message: "Failed to fetch facility settings." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "HOSPITAL" || !user.hospitalId) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    await ensureHospitalSettingsSchema();
    const body = (await req.json()) as unknown;
    const parsed = parseHospitalFacilitySettings(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed.", fieldErrors: parsed.fieldErrors }, { status: 400 });
    }

    const settings = await updateHospitalFacilitySettings(user.hospitalId, parsed.data);
    if (!settings) {
      return NextResponse.json({ message: "Hospital facility settings not found." }, { status: 404 });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("PATCH /api/settings/hospital/facility failed", error);
    return NextResponse.json({ message: "Failed to update facility settings." }, { status: 500 });
  }
}
