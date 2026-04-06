import { NextResponse } from "next/server";

import { isAppMode } from "@/lib/appMode";
import { getAuthenticatedUser } from "@/lib/authContext";
import { updateUserMode } from "@/lib/userModeRepository";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ mode: user.currentMode });
  } catch (error) {
    console.error("GET /api/settings/user-mode failed", error);
    return NextResponse.json({ message: "モード設定の取得に失敗しました。" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as { mode?: unknown };
    if (!isAppMode(body.mode)) {
      return NextResponse.json({ message: "モードの値が不正です。" }, { status: 400 });
    }

    const mode = await updateUserMode(user.id, body.mode);
    return NextResponse.json({ mode });
  } catch (error) {
    console.error("PATCH /api/settings/user-mode failed", error);
    return NextResponse.json({ message: "モード設定の更新に失敗しました。" }, { status: 500 });
  }
}
