import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { getEmsInputSettings, updateEmsInputSettings } from "@/lib/emsSettingsRepository";
import { ensureEmsSettingsSchema } from "@/lib/emsSettingsSchema";
import { parseEmsInputSettings } from "@/lib/emsSettingsValidation";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "EMS") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    await ensureEmsSettingsSchema();
    const settings = await getEmsInputSettings(user.id);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("GET /api/settings/ambulance/input failed", error);
    return NextResponse.json({ message: "Failed to fetch input settings." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "EMS") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    await ensureEmsSettingsSchema();
    const body = (await req.json()) as unknown;
    const parsed = parseEmsInputSettings(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed.", fieldErrors: parsed.fieldErrors }, { status: 400 });
    }

    const settings = await updateEmsInputSettings(user.id, parsed.data);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("PATCH /api/settings/ambulance/input failed", error);
    return NextResponse.json({ message: "Failed to update input settings." }, { status: 500 });
  }
}
