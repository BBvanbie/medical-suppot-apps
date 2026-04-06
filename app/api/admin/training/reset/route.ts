import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { getTrainingDataSummary, resetTrainingData } from "@/lib/trainingDataAdminRepository";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "ADMIN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const summary = await getTrainingDataSummary();
    return NextResponse.json({ summary });
  } catch (error) {
    console.error("GET /api/admin/training/reset failed", error);
    return NextResponse.json({ message: "訓練データ件数の取得に失敗しました。" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "ADMIN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const result = await resetTrainingData(user);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("DELETE /api/admin/training/reset failed", error);
    return NextResponse.json({ message: "訓練データの一括リセットに失敗しました。" }, { status: 500 });
  }
}
