import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { getEmsSyncState } from "@/lib/emsSyncRepository";
import { ensureEmsSyncSchema } from "@/lib/emsSyncSchema";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "EMS") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    await ensureEmsSyncSchema();
    const state = await getEmsSyncState(user.id);
    return NextResponse.json(state);
  } catch (error) {
    console.error("GET /api/settings/ambulance/sync failed", error);
    return NextResponse.json({ message: "Failed to fetch sync state." }, { status: 500 });
  }
}
