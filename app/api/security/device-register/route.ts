import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { registerCurrentDevice, resolveDeviceKey } from "@/lib/securityAuthRepository";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "EMS" && user.role !== "HOSPITAL") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as { registrationCode?: string } | null;
    const registrationCode = String(body?.registrationCode ?? "").trim().toUpperCase();
    if (!registrationCode) {
      return NextResponse.json({ message: "登録コードを入力してください。" }, { status: 400 });
    }

    const deviceKey = resolveDeviceKey(request);
    const result = await registerCurrentDevice({
      actor: user,
      deviceKey,
      registrationCode,
    });

    if (!result.ok) {
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
