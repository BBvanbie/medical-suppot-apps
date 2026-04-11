import type { AuthenticationResponseJSON } from "@simplewebauthn/types";
import { NextResponse } from "next/server";

import { unstable_update } from "@/auth";
import { getMfaPendingAuthenticatedUser } from "@/lib/mfaAuthContext";
import { isMfaRequiredForRole } from "@/lib/mfaPolicy";
import { getRequestOrigin } from "@/lib/requestOrigin";
import { recordSecuritySignalEvent } from "@/lib/systemMonitor";
import { verifyMfaAuthentication } from "@/lib/webauthnMfaRepository";

export async function POST(request: Request) {
  try {
    const user = await getMfaPendingAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!isMfaRequiredForRole(user.role)) {
      await recordSecuritySignalEvent({
        source: "mfa.authenticate.verify",
        message: "MFA 認証対象外のロールが認証検証を試行しました。",
        metadata: { signalType: "mfa_auth_forbidden", userId: user.id, role: user.role },
      });
      return NextResponse.json({ message: "MFA 認証対象外です。" }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as { response?: AuthenticationResponseJSON } | null;
    if (!body?.response) {
      await recordSecuritySignalEvent({
        source: "mfa.authenticate.verify",
        message: "MFA 認証レスポンス不備を検知しました。",
        metadata: { signalType: "mfa_auth_invalid_response", userId: user.id, role: user.role },
      });
      return NextResponse.json({ message: "MFA 認証レスポンスがありません。" }, { status: 400 });
    }

    const result = await verifyMfaAuthentication({ user, origin: getRequestOrigin(request), response: body.response });
    if (!result.ok) {
      await recordSecuritySignalEvent({
        source: "mfa.authenticate.verify",
        message: "MFA 認証検証に失敗しました。",
        metadata: { signalType: "mfa_auth_failed", userId: user.id, role: user.role },
      });
      return NextResponse.json({ message: result.message }, { status: 400 });
    }

    await unstable_update({ mfaVerifiedAt: Date.now() } as never);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/security/mfa/authenticate/verify failed", error);
    return NextResponse.json({ message: "MFA 認証に失敗しました。" }, { status: 500 });
  }
}
