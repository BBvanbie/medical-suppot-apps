import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { FAIL_SAFE_ROLE_POLICIES, getFailSafeStatus } from "@/lib/failSafePolicy";

export async function GET() {
  const startedAt = Date.now();

  try {
    await db.query("SELECT 1");
    return NextResponse.json(
      {
        ok: true,
        status: "healthy",
        checks: {
          app: "ok",
          db: "ok",
        },
        failSafe: {
          status: getFailSafeStatus(true),
          rolePolicies: FAIL_SAFE_ROLE_POLICIES,
        },
        latencyMs: Date.now() - startedAt,
        checkedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        status: "unhealthy",
        checks: {
          app: "ok",
          db: "error",
        },
        failSafe: {
          status: getFailSafeStatus(false),
          rolePolicies: FAIL_SAFE_ROLE_POLICIES,
        },
        latencyMs: Date.now() - startedAt,
        checkedAt: new Date().toISOString(),
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
