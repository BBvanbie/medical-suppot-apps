import { NextResponse } from "next/server";

import {
  createAdminComplianceRun,
  getAdminComplianceDashboardSummary,
  parseAdminComplianceRunInput,
} from "@/lib/admin/adminComplianceRepository";
import { getAuthenticatedUser } from "@/lib/authContext";
import { authorizeAdminRoute } from "@/lib/routeAccess";
import { recordApiFailureEvent } from "@/lib/systemMonitor";

export async function GET() {
  try {
    const access = authorizeAdminRoute(await getAuthenticatedUser());
    if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });

    const summary = await getAdminComplianceDashboardSummary();
    return NextResponse.json(summary);
  } catch (error) {
    console.error("GET /api/admin/compliance-runs failed", error);
    await recordApiFailureEvent("api.admin.compliance-runs.get", error);
    return NextResponse.json({ message: "Failed to fetch compliance runs." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const access = authorizeAdminRoute(await getAuthenticatedUser());
    if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });

    const body = (await request.json().catch(() => null)) as unknown;
    const parsed = parseAdminComplianceRunInput(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.message, fieldErrors: parsed.fieldErrors }, { status: 400 });
    }

    const row = await createAdminComplianceRun(parsed.data, access.user);
    return NextResponse.json({ row }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/compliance-runs failed", error);
    if (
      error instanceof Error &&
      (error.message.includes("organizationId does not resolve") ||
        error.message.includes("organizationId is required") ||
        error.message.includes("organizationId must be null"))
    ) {
      return NextResponse.json(
        { message: "Invalid organization scope or ID.", fieldErrors: { organizationId: "対象スコープに対応する既存 ID を指定してください。" } },
        { status: 400 },
      );
    }
    await recordApiFailureEvent("api.admin.compliance-runs.post", error);
    return NextResponse.json({ message: "Failed to create compliance run." }, { status: 500 });
  }
}
