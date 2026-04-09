import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { getDeviceTrustStateForUser, resolveDeviceKey } from "@/lib/securityAuthRepository";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const deviceKey = resolveDeviceKey(request);
    const trustState = await getDeviceTrustStateForUser({
      userId: user.id,
      role: user.role,
      teamId: user.teamId,
      hospitalId: user.hospitalId,
      deviceKey,
    });

    return NextResponse.json(
      {
        role: user.role,
        username: user.username,
        deviceKey,
        ...trustState,
      },
      {
        headers: {
          "x-device-key": deviceKey,
        },
      },
    );
  } catch (error) {
    console.error("GET /api/security/device-status failed", error);
    return NextResponse.json({ message: "Failed to fetch device status." }, { status: 500 });
  }
}
