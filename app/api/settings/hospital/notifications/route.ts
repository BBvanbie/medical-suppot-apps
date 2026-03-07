import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { getHospitalNotificationSettings, updateHospitalNotificationSettings } from "@/lib/hospitalSettingsRepository";
import { ensureHospitalSettingsSchema } from "@/lib/hospitalSettingsSchema";
import { parseHospitalNotificationSettings } from "@/lib/hospitalSettingsValidation";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "HOSPITAL" || !user.hospitalId) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    await ensureHospitalSettingsSchema();
    const settings = await getHospitalNotificationSettings(user.hospitalId);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("GET /api/settings/hospital/notifications failed", error);
    return NextResponse.json({ message: "Failed to fetch notification settings." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "HOSPITAL" || !user.hospitalId) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    await ensureHospitalSettingsSchema();
    const body = (await req.json()) as unknown;
    const parsed = parseHospitalNotificationSettings(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed.", fieldErrors: parsed.fieldErrors }, { status: 400 });
    }

    const settings = await updateHospitalNotificationSettings(user.hospitalId, parsed.data);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("PATCH /api/settings/hospital/notifications failed", error);
    return NextResponse.json({ message: "Failed to update notification settings." }, { status: 500 });
  }
}
