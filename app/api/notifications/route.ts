import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";
import { listNotificationsForUser, markNotificationsRead } from "@/lib/notifications";
import { consumeRateLimit } from "@/lib/rateLimit";
import { isSchemaRequirementsError } from "@/lib/schemaRequirements";
import { recordApiFailureEvent } from "@/lib/systemMonitor";

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
    const rateLimit = await consumeRateLimit({
      policyName: "notifications_read",
      routeKey: "api.notifications.get",
      request: req,
      user,
    });
    if (!rateLimit.ok) {
      return NextResponse.json(
        { message: `通知取得の上限に達しました。${rateLimit.retryAfterSeconds} 秒後に再試行してください。` },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? "30");
    const data = await listNotificationsForUser(user, Number.isFinite(limit) ? limit : 30);

    return NextResponse.json(data);
  } catch (error) {
    if (isSchemaRequirementsError(error, "ensureHospitalRequestTables")) {
      console.warn("[notifications] hospital request schema requirements missing; returning empty notifications.");
      return NextResponse.json({
        items: [],
        unreadCount: 0,
        unreadMenuKeys: [],
        unreadTabKeys: [],
      });
    }
    console.error("GET /api/notifications failed", error);
    await recordApiFailureEvent("api.notifications.get", error);
    return NextResponse.json({ message: "通知の取得に失敗しました。" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await ensureHospitalRequestTables();
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const rateLimit = await consumeRateLimit({
      policyName: "critical_update",
      routeKey: "api.notifications.patch",
      request: req,
      user,
    });
    if (!rateLimit.ok) {
      return NextResponse.json(
        { message: `通知更新の上限に達しました。${rateLimit.retryAfterSeconds} 秒後に再試行してください。` },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

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
    if (isSchemaRequirementsError(error, "ensureHospitalRequestTables")) {
      console.warn("[notifications] hospital request schema requirements missing; skipping notification update.");
      return NextResponse.json({ ok: true, updated: 0 });
    }
    console.error("PATCH /api/notifications failed", error);
    await recordApiFailureEvent("api.notifications.patch", error);
    return NextResponse.json({ message: "通知既読処理に失敗しました。" }, { status: 500 });
  }
}
