import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { getEmsOperator } from "@/lib/emsOperator";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "EMS") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const operator = await getEmsOperator();
    return NextResponse.json({ name: operator.name, code: operator.code });
  } catch (error) {
    console.error("GET /api/ems/operator failed", error);
    return NextResponse.json({ message: "Failed to fetch operator." }, { status: 500 });
  }
}
