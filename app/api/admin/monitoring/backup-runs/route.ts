import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { getAuthenticatedUser } from "@/lib/authContext";
import { authorizeAdminRoute } from "@/lib/routeAccess";
import { recordApiFailureEvent, recordBackupRunReport } from "@/lib/systemMonitor";

function isAuthorizedBackupReporter(request: Request) {
  const expectedToken = process.env.BACKUP_REPORT_TOKEN;
  if (!expectedToken) return false;

  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expectedToken);
  return tokenBuffer.length === expectedBuffer.length && timingSafeEqual(tokenBuffer, expectedBuffer);
}

export async function POST(request: Request) {
  try {
    const isJobReporter = isAuthorizedBackupReporter(request);
    const access = isJobReporter ? null : authorizeAdminRoute(await getAuthenticatedUser());
    if (!isJobReporter && access && !access.ok) {
      return NextResponse.json({ message: access.message }, { status: access.status });
    }

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
      reportedByUserId: access?.ok ? access.user.id : null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/admin/monitoring/backup-runs failed", error);
    await recordApiFailureEvent("api.admin.monitoring.backup-runs.post", error);
    return NextResponse.json({ message: "Failed to report backup run." }, { status: 500 });
  }
}
