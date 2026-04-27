import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { getEmsOperationalMode, updateEmsOperationalMode } from "@/lib/emsSettingsRepository";
import { ensureEmsSettingsSchema } from "@/lib/emsSettingsSchema";
import { parseEmsOperationalMode } from "@/lib/emsSettingsValidation";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "EMS") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    await ensureEmsSettingsSchema();
    const operationalMode = await getEmsOperationalMode(user.id);
    return NextResponse.json({ operationalMode });
  } catch (error) {
    console.error("GET /api/settings/ambulance/operational-mode failed", error);
    return NextResponse.json({ message: "運用モードの取得に失敗しました。" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "EMS") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    await ensureEmsSettingsSchema();
    const body = (await req.json()) as unknown;
    const parsed = parseEmsOperationalMode(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "入力内容を確認してください。", fieldErrors: parsed.fieldErrors },
        { status: 400 },
      );
    }

    const operationalMode = await updateEmsOperationalMode(user.id, parsed.data.operationalMode);
    return NextResponse.json({ operationalMode });
  } catch (error) {
    console.error("PATCH /api/settings/ambulance/operational-mode failed", error);
    return NextResponse.json({ message: "運用モードの更新に失敗しました。" }, { status: 500 });
  }
}
