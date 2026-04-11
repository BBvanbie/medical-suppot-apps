import { NextResponse } from "next/server";

import { getMfaPendingAuthenticatedUser } from "@/lib/mfaAuthContext";
import { isMfaRequiredForRole } from "@/lib/mfaPolicy";
import { getRequestOrigin } from "@/lib/requestOrigin";
import { recordSecuritySignalEvent } from "@/lib/systemMonitor";
import { createMfaRegistrationOptions } from "@/lib/webauthnMfaRepository";

export async function POST(request: Request) {
  try {
    const user = await getMfaPendingAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!isMfaRequiredForRole(user.role)) {
      await recordSecuritySignalEvent({
        source: "mfa.register.options",
        message: "MFA 登録対象外のロールが登録開始を試行しました。",
        metadata: { signalType: "mfa_register_options_forbidden", userId: user.id, role: user.role },
      });
      return NextResponse.json({ message: "MFA 登録対象外です。" }, { status: 403 });
    }

    const options = await createMfaRegistrationOptions(user, getRequestOrigin(request));
    return NextResponse.json(options);
  } catch (error) {
    console.error("POST /api/security/mfa/register/options failed", error);
    return NextResponse.json({ message: "MFA 登録の準備に失敗しました。" }, { status: 500 });
  }
}
