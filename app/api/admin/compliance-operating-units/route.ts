import { NextResponse } from "next/server";

import {
  createComplianceOperatingUnit,
  parseComplianceOperatingUnitCreateInput,
  parseComplianceOperatingUnitUpdateInput,
  updateComplianceOperatingUnit,
} from "@/lib/admin/adminComplianceRepository";
import { getAuthenticatedUser } from "@/lib/authContext";
import { authorizeAdminRoute } from "@/lib/routeAccess";
import { recordApiFailureEvent } from "@/lib/systemMonitor";

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export async function POST(request: Request) {
  try {
    const access = authorizeAdminRoute(await getAuthenticatedUser());
    if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });

    const body = (await request.json().catch(() => null)) as unknown;
    const parsed = parseComplianceOperatingUnitCreateInput(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.message, fieldErrors: parsed.fieldErrors }, { status: 400 });
    }

    const row = await createComplianceOperatingUnit(parsed.data);
    return NextResponse.json({ row }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/compliance-operating-units failed", error);
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { message: "Operating unit already exists.", fieldErrors: { unitCode: "この scope / unit code は既に登録されています。" } },
        { status: 400 },
      );
    }
    await recordApiFailureEvent("api.admin.compliance-operating-units.post", error);
    return NextResponse.json({ message: "Failed to create compliance operating unit." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const access = authorizeAdminRoute(await getAuthenticatedUser());
    if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });

    const body = (await request.json().catch(() => null)) as unknown;
    const parsed = parseComplianceOperatingUnitUpdateInput(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.message, fieldErrors: parsed.fieldErrors }, { status: 400 });
    }

    const row = await updateComplianceOperatingUnit(parsed.data);
    return NextResponse.json({ row }, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/admin/compliance-operating-units failed", error);
    if (error instanceof Error && error.message === "Compliance operating unit not found.") {
      return NextResponse.json({ message: error.message, fieldErrors: { id: "対象の運用主体が見つかりません。" } }, { status: 404 });
    }
    await recordApiFailureEvent("api.admin.compliance-operating-units.patch", error);
    return NextResponse.json({ message: "Failed to update compliance operating unit." }, { status: 500 });
  }
}
