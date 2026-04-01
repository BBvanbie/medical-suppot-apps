import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";
import { listNotificationsForUser, markNotificationsRead } from "@/lib/notifications";

type PatchBody = {
  ids?: number[];
  menuKey?: string;
  tabKey?: string;
  all?: boolean;
  ack?: boolean;
};

export async function GET(req: Request) {
  try {
    await ensureHospitalRequestTables();
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? "30");
    const data = await listNotificationsForUser(user, Number.isFinite(limit) ? limit : 30);

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/notifications failed", error);
    return NextResponse.json({ message: "通知の取得に失敗しました。" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await ensureHospitalRequestTables();
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as PatchBody;
    const updated = await markNotificationsRead(user, {
      ids: body.ids,
      menuKey: body.menuKey,
      tabKey: body.tabKey,
      all: Boolean(body.all),
      ack: Boolean(body.ack),
    });

    return NextResponse.json({ ok: true, updated });
  } catch (error) {
    console.error("PATCH /api/notifications failed", error);
    return NextResponse.json({ message: "通知既読処理に失敗しました。" }, { status: 500 });
  }
}
