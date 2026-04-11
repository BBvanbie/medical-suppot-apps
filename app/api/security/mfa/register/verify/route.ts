import type { RegistrationResponseJSON } from "@simplewebauthn/types";
import { NextResponse } from "next/server";

import { unstable_update } from "@/auth";
import { getMfaPendingAuthenticatedUser } from "@/lib/mfaAuthContext";
import { isMfaRequiredForRole } from "@/lib/mfaPolicy";
import { getRequestOrigin } from "@/lib/requestOrigin";
import { recordSecuritySignalEvent } from "@/lib/systemMonitor";
import { verifyAndStoreMfaRegistration } from "@/lib/webauthnMfaRepository";

export async function POST(request: Request) {
  try {
    const user = await getMfaPendingAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!isMfaRequiredForRole(user.role)) {
      await recordSecuritySignalEvent({
        source: "mfa.register.verify",
        message: "MFA 登録対象外のロールが登録検証を試行しました。",
        metadata: { signalType: "mfa_register_forbidden", userId: user.id, role: user.role },
      });
      return NextResponse.json({ message: "MFA 登録対象外です。" }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as
      | { response?: RegistrationResponseJSON; credentialName?: string }
      | null;
    if (!body?.response) {
      await recordSecuritySignalEvent({
        source: "mfa.register.verify",
        message: "MFA 登録レスポンス不備を検知しました。",
        metadata: { signalType: "mfa_register_invalid_response", userId: user.id, role: user.role },
      });
      return NextResponse.json({ message: "MFA 登録レスポンスがありません。" }, { status: 400 });
    }

    const result = await verifyAndStoreMfaRegistration({
      user,
      origin: getRequestOrigin(request),
      response: body.response,
      credentialName: body.credentialName,
    });
    if (!result.ok) {
      await recordSecuritySignalEvent({
        source: "mfa.register.verify",
        message: "MFA 登録検証に失敗しました。",
        metadata: { signalType: "mfa_register_failed", userId: user.id, role: user.role },
      });
      return NextResponse.json({ message: result.message }, { status: 400 });
    }

    await unstable_update({ mfaVerifiedAt: Date.now() } as never);
    return NextResponse.json({ ok: true, credentialName: result.credentialName });
  } catch (error) {
    console.error("POST /api/security/mfa/register/verify failed", error);
    return NextResponse.json({ message: "MFA 登録に失敗しました。" }, { status: 500 });
  }
}
