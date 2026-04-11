import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { registerCurrentDevice, resolveDeviceKey } from "@/lib/securityAuthRepository";
import { recordSecuritySignalEvent } from "@/lib/systemMonitor";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "EMS" && user.role !== "HOSPITAL") {
      await recordSecuritySignalEvent({
        source: "device.register",
        message: "端末登録対象外のロールが端末登録を試行しました。",
        metadata: { signalType: "device_register_forbidden", userId: user.id, role: user.role },
      });
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as { registrationCode?: string } | null;
    const registrationCode = String(body?.registrationCode ?? "").trim().toUpperCase();
    if (!registrationCode) {
      await recordSecuritySignalEvent({
        source: "device.register",
        message: "登録コード未入力の端末登録試行を検知しました。",
        metadata: { signalType: "device_register_missing_code", userId: user.id, role: user.role },
      });
      return NextResponse.json({ message: "登録コードを入力してください。" }, { status: 400 });
    }

    const deviceKey = resolveDeviceKey(request);
    const result = await registerCurrentDevice({
      actor: user,
      deviceKey,
      registrationCode,
    });

    if (!result.ok) {
      await recordSecuritySignalEvent({
        source: "device.register",
        message: "端末登録コードの検証に失敗しました。",
        metadata: { signalType: "device_register_failed", userId: user.id, role: user.role },
      });
      return NextResponse.json({ message: result.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        ok: true,
        deviceName: result.deviceName,
        deviceKey,
      },
      {
        headers: {
          "x-device-key": deviceKey,
        },
      },
    );
  } catch (error) {
    console.error("POST /api/security/device-register failed", error);
    return NextResponse.json({ message: "端末登録に失敗しました。" }, { status: 500 });
  }
}
