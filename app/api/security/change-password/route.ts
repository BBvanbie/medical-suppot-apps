import { NextResponse } from "next/server";

import { getMfaPendingAuthenticatedUser } from "@/lib/mfaAuthContext";
import { changePasswordForAuthenticatedUser } from "@/lib/securityAuthRepository";

function isStrongEnough(password: string) {
  return password.length >= 10;
}

export async function POST(request: Request) {
  try {
    const user = await getMfaPendingAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = (await request.json().catch(() => null)) as
      | { currentPassword?: string; newPassword?: string; confirmPassword?: string }
      | null;

    const currentPassword = String(body?.currentPassword ?? "");
    const newPassword = String(body?.newPassword ?? "");
    const confirmPassword = String(body?.confirmPassword ?? "");

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ message: "すべての項目を入力してください。" }, { status: 400 });
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ message: "新しいパスワードが一致しません。" }, { status: 400 });
    }
    if (!isStrongEnough(newPassword)) {
      return NextResponse.json({ message: "新しいパスワードは 10 文字以上で入力してください。" }, { status: 400 });
    }

    const result = await changePasswordForAuthenticatedUser({
      userId: user.id,
      currentPassword,
      newPassword,
      actor: user,
    });
    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/security/change-password failed", error);
    return NextResponse.json({ message: "パスワード変更に失敗しました。" }, { status: 500 });
  }
}
