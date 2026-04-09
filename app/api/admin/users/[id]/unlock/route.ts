import { NextResponse } from "next/server";

import { ensureAdminManagementSchema } from "@/lib/admin/adminManagementSchema";
import { getAuthenticatedUser } from "@/lib/authContext";
import { authorizeAdminRoute } from "@/lib/routeAccess";
import { unlockUserLoginLock } from "@/lib/securityAuthRepository";

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
    const result = await unlockUserLoginLock({ userId: id, actor: access.user });
    if (!result) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, username: result.username });
  } catch (error) {
    console.error("POST /api/admin/users/[id]/unlock failed", error);
    return NextResponse.json({ message: "Failed to unlock user." }, { status: 500 });
  }
}
