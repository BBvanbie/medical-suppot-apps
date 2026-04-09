import { NextRequest, NextResponse } from "next/server";

import { isLoginLocked } from "@/lib/securityAuthRepository";

export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get("username")?.trim() ?? "";
    if (!username) {
      return NextResponse.json({ locked: false, lockedUntil: null });
    }

    const lockedUntil = await isLoginLocked(username);
    return NextResponse.json({
      locked: Boolean(lockedUntil),
      lockedUntil: lockedUntil ? lockedUntil.toISOString() : null,
    });
  } catch (error) {
    console.error("GET /api/security/login-status failed", error);
    return NextResponse.json({ message: "Failed to fetch login status." }, { status: 500 });
  }
}
