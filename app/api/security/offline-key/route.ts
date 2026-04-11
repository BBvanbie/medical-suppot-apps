import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { getDeviceTrustStateForUser, resolveDeviceKey } from "@/lib/securityAuthRepository";
import { recordSecuritySignalEvent } from "@/lib/systemMonitor";

function getOfflineKeySecret() {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? process.env.OFFLINE_DATA_KEY_SECRET ?? "";
}

function toBase64Url(buffer: Buffer) {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    if (user.role !== "EMS") {
      await recordSecuritySignalEvent({
        source: "offline-key",
        message: "オフライン暗号鍵の対象外ロールによる取得試行を検知しました。",
        metadata: { signalType: "offline_key_forbidden_role", userId: user.id, role: user.role },
      });
      return NextResponse.json({ message: "Offline key is only available for EMS." }, { status: 403 });
    }

    const secret = getOfflineKeySecret();
    if (!secret) {
      return NextResponse.json({ message: "Offline key secret is not configured." }, { status: 503 });
    }

    const deviceKey = resolveDeviceKey(request);
    const trustState = await getDeviceTrustStateForUser({
      userId: user.id,
      role: user.role,
      teamId: user.teamId,
      hospitalId: user.hospitalId,
      deviceKey,
    });

    if (trustState.deviceEnforcementRequired && !trustState.deviceTrusted) {
      await recordSecuritySignalEvent({
        source: "offline-key",
        message: "未登録端末によるオフライン暗号鍵取得を拒否しました。",
        metadata: { signalType: "offline_key_untrusted_device", userId: user.id, role: user.role },
      });
      return NextResponse.json({ message: "Device is not trusted." }, { status: 403 });
    }

    const keyMaterial = createHmac("sha256", secret)
      .update(`offline-data:v1:${user.id}:${user.role}:${user.teamId ?? "-"}:${deviceKey}`)
      .digest();

    return NextResponse.json(
      {
        algorithm: "AES-GCM",
        keyVersion: "offline-data-v1",
        key: toBase64Url(keyMaterial),
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "x-device-key": deviceKey,
        },
      },
    );
  } catch (error) {
    console.error("GET /api/security/offline-key failed", error);
    return NextResponse.json({ message: "Failed to issue offline key." }, { status: 500 });
  }
}
