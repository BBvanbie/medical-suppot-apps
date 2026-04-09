import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { authorizeAdminRoute } from "@/lib/routeAccess";
import { recordBackupRunReport } from "@/lib/systemMonitor";

export async function POST(request: Request) {
  try {
    const access = authorizeAdminRoute(await getAuthenticatedUser());
    if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });

    const body = (await request.json().catch(() => null)) as
      | {
          status?: "success" | "failure";
          startedAt?: string | null;
          completedAt?: string | null;
          retentionDays?: number | null;
          details?: unknown;
        }
      | null;

    if (body?.status !== "success" && body?.status !== "failure") {
      return NextResponse.json({ message: "status must be success or failure." }, { status: 400 });
    }

    await recordBackupRunReport({
      status: body.status,
      startedAt: body.startedAt ?? null,
      completedAt: body.completedAt ?? null,
      retentionDays: typeof body.retentionDays === "number" ? body.retentionDays : 14,
      details: body.details,
      reportedByUserId: access.user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/admin/monitoring/backup-runs failed", error);
    return NextResponse.json({ message: "Failed to report backup run." }, { status: 500 });
  }
}
