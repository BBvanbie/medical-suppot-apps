import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { runEmsSync } from "@/lib/emsSyncRepository";
import { ensureEmsSyncSchema } from "@/lib/emsSyncSchema";

export async function POST() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "EMS") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    await ensureEmsSyncSchema();
    const state = await runEmsSync(user.id);
    return NextResponse.json(state);
  } catch (error) {
    console.error("POST /api/settings/ambulance/sync/run failed", error);
    return NextResponse.json({ message: "Failed to run sync." }, { status: 500 });
  }
}
