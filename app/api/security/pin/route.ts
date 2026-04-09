import { NextRequest, NextResponse } from "next/server";

import { writeAuditLog } from "@/lib/auditLog";
import { getAuthenticatedUser } from "@/lib/authContext";
import {
  getCurrentDevicePinState,
  resolveDeviceKey,
  upsertDevicePin,
  verifyDevicePin,
} from "@/lib/securityAuthRepository";

function isValidPin(pin: string) {
  return /^[0-9]{6}$/.test(pin);
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const deviceKey = resolveDeviceKey(request);
    const state = await getCurrentDevicePinState(user.id, user.role, deviceKey);
    return NextResponse.json(state, {
      headers: {
        "x-device-key": state.deviceKey,
      },
    });
  } catch (error) {
    console.error("GET /api/security/pin failed", error);
    return NextResponse.json({ message: "Failed to fetch PIN state." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = (await request.json().catch(() => null)) as { action?: string; pin?: string } | null;
    const pin = String(body?.pin ?? "");
    const deviceKey = resolveDeviceKey(request);

    if (body?.action === "set") {
      if (!isValidPin(pin)) {
        return NextResponse.json({ message: "PIN は 6 桁の数字で入力してください。" }, { status: 400 });
      }

      await upsertDevicePin(user, deviceKey, pin);
      return NextResponse.json({ ok: true, deviceKey });
    }

    if (body?.action === "verify") {
      if (!isValidPin(pin)) {
        return NextResponse.json({ message: "PIN は 6 桁の数字で入力してください。" }, { status: 400 });
      }

      const result = await verifyDevicePin(user, deviceKey, pin);
      if (!result.ok) {
        return NextResponse.json(
          { message: result.message, lockedUntil: result.lockedUntil, deviceKey },
          { status: result.status },
        );
      }

      await writeAuditLog({
        actor: user,
        action: "security.pin.unlock",
        targetType: "user_device_security",
        targetId: `${user.id}:${deviceKey}`,
        metadata: { deviceKey },
      });

      return NextResponse.json({ ok: true, deviceKey });
    }

    return NextResponse.json({ message: "Unsupported action." }, { status: 400 });
  } catch (error) {
    console.error("POST /api/security/pin failed", error);
    return NextResponse.json({ message: "Failed to update PIN state." }, { status: 500 });
  }
}
