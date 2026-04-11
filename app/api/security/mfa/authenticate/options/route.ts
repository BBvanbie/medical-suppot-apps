import { NextResponse } from "next/server";

import { getMfaPendingAuthenticatedUser } from "@/lib/mfaAuthContext";
import { isMfaRequiredForRole } from "@/lib/mfaPolicy";
import { getRequestOrigin } from "@/lib/requestOrigin";
import { recordSecuritySignalEvent } from "@/lib/systemMonitor";
import { createMfaAuthenticationOptions, hasActiveMfaCredential } from "@/lib/webauthnMfaRepository";

export async function POST(request: Request) {
  try {
    const user = await getMfaPendingAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!isMfaRequiredForRole(user.role)) {
      await recordSecuritySignalEvent({
        source: "mfa.authenticate.options",
        message: "MFA 認証対象外のロールが認証開始を試行しました。",
        metadata: { signalType: "mfa_auth_options_forbidden", userId: user.id, role: user.role },
      });
      return NextResponse.json({ message: "MFA 認証対象外です。" }, { status: 403 });
    }
    if (!(await hasActiveMfaCredential(user.id))) {
      await recordSecuritySignalEvent({
        source: "mfa.authenticate.options",
        message: "MFA credential 未登録状態で認証開始が試行されました。",
        metadata: { signalType: "mfa_auth_without_credential", userId: user.id, role: user.role },
      });
      return NextResponse.json({ message: "MFA credential が未登録です。" }, { status: 409 });
    }

    const options = await createMfaAuthenticationOptions(user, getRequestOrigin(request));
    return NextResponse.json(options);
  } catch (error) {
    console.error("POST /api/security/mfa/authenticate/options failed", error);
    return NextResponse.json({ message: "MFA 認証の準備に失敗しました。" }, { status: 500 });
  }
}
