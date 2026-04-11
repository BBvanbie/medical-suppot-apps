import { NextResponse } from "next/server";

import { getMfaPendingAuthenticatedUser } from "@/lib/mfaAuthContext";
import { isMfaRequiredForRole } from "@/lib/mfaPolicy";
import { hasActiveMfaCredential } from "@/lib/webauthnMfaRepository";

export async function GET() {
  try {
    const user = await getMfaPendingAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const mfaRequired = isMfaRequiredForRole(user.role);
    const mfaEnrolled = await hasActiveMfaCredential(user.id);
    return NextResponse.json({
      role: user.role,
      username: user.username,
      mfaRequired,
      mfaEnrolled,
    });
  } catch (error) {
    console.error("GET /api/security/mfa/status failed", error);
    return NextResponse.json({ message: "MFA 状態の取得に失敗しました。" }, { status: 500 });
  }
}
