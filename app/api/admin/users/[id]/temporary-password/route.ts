import { NextResponse } from "next/server";

import { ensureAdminManagementSchema } from "@/lib/admin/adminManagementSchema";
import { getAuthenticatedUser } from "@/lib/authContext";
import { authorizeAdminRoute } from "@/lib/routeAccess";
import { issueTemporaryPasswordForUser } from "@/lib/securityAuthRepository";

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const access = authorizeAdminRoute(await getAuthenticatedUser());
    if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });

    const params = await context.params;
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ message: "Invalid id." }, { status: 400 });
    }

    await ensureAdminManagementSchema();
    const result = await issueTemporaryPasswordForUser({ userId: id, actor: access.user });
    if (!result) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/admin/users/[id]/temporary-password failed", error);
    return NextResponse.json({ message: "Failed to issue temporary password." }, { status: 500 });
  }
}
