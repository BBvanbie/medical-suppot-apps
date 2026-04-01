import { NextResponse } from "next/server";

import { listAdminAuditLogs, updateAdminOrg } from "@/lib/admin/adminManagementRepository";
import { ensureAdminManagementSchema } from "@/lib/admin/adminManagementSchema";
import { getAuthenticatedUser } from "@/lib/authContext";
import { authorizeAdminRoute } from "@/lib/routeAccess";

function isOrgType(value: string): value is "hospital" | "ambulance_team" {
  return value === "hospital" || value === "ambulance_team";
}

export async function PATCH(req: Request, context: { params: Promise<{ type: string; id: string }> }) {
  try {
    const access = authorizeAdminRoute(await getAuthenticatedUser());
    if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });
    const user = access.user;

    const params = await context.params;
    if (!isOrgType(params.type)) return NextResponse.json({ message: "Invalid type." }, { status: 400 });
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ message: "Invalid id." }, { status: 400 });

    const body = (await req.json()) as { displayOrder?: unknown; isActive?: unknown };
    const displayOrder = Number(body.displayOrder);
    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      return NextResponse.json({ message: "Validation failed.", fieldErrors: { displayOrder: "表示順は 0 以上の整数で入力してください。" } }, { status: 400 });
    }

    await ensureAdminManagementSchema();
    const row = await updateAdminOrg(params.type, id, { displayOrder, isActive: body.isActive === true }, user);
    if (!row) return NextResponse.json({ message: "Org not found." }, { status: 404 });
    return NextResponse.json({ row });
  } catch (error) {
    console.error("PATCH /api/admin/orgs/[type]/[id] failed", error);
    return NextResponse.json({ message: "Failed to update org." }, { status: 500 });
  }
}

export async function GET(_req: Request, context: { params: Promise<{ type: string; id: string }> }) {
  try {
    const access = authorizeAdminRoute(await getAuthenticatedUser());
    if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });

    const params = await context.params;
    if (!isOrgType(params.type)) return NextResponse.json({ message: "Invalid type." }, { status: 400 });
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ message: "Invalid id." }, { status: 400 });

    await ensureAdminManagementSchema();
    const logs = await listAdminAuditLogs(params.type, id);
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("GET /api/admin/orgs/[type]/[id] failed", error);
    return NextResponse.json({ message: "Failed to fetch org logs." }, { status: 500 });
  }
}
