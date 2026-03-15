import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { getEmsDisplaySettings, updateEmsDisplaySettings } from "@/lib/emsSettingsRepository";
import { ensureEmsSettingsSchema } from "@/lib/emsSettingsSchema";
import { parseEmsDisplaySettings } from "@/lib/emsSettingsValidation";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "EMS") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    await ensureEmsSettingsSchema();
    const settings = await getEmsDisplaySettings(user.id);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("GET /api/settings/ambulance/display failed", error);
    return NextResponse.json({ message: "\u8868\u793a\u8a2d\u5b9a\u306e\u53d6\u5f97\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "EMS") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    await ensureEmsSettingsSchema();
    const body = (await req.json()) as unknown;
    const parsed = parseEmsDisplaySettings(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "\u5165\u529b\u5185\u5bb9\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002", fieldErrors: parsed.fieldErrors },
        { status: 400 },
      );
    }

    const settings = await updateEmsDisplaySettings(user.id, parsed.data);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("PATCH /api/settings/ambulance/display failed", error);
    return NextResponse.json({ message: "\u8868\u793a\u8a2d\u5b9a\u306e\u66f4\u65b0\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002" }, { status: 500 });
  }
}
