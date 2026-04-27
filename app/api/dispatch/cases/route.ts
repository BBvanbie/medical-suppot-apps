import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { createDispatchCase, listDispatchCases } from "@/lib/dispatch/dispatchRepository";
import { ensureDispatchSchema } from "@/lib/dispatch/dispatchSchema";
import { parseDispatchCaseCreateInput } from "@/lib/dispatch/dispatchValidation";

function canAccessDispatch(user: Awaited<ReturnType<typeof getAuthenticatedUser>>) {
  return user?.role === "DISPATCH" || user?.role === "ADMIN";
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!canAccessDispatch(user)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    await ensureDispatchSchema();
    const rows = await listDispatchCases(user.currentMode);
    return NextResponse.json({ rows });
  } catch (error) {
    console.error("GET /api/dispatch/cases failed", error);
    return NextResponse.json({ message: "指令一覧の取得に失敗しました。" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!canAccessDispatch(user)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const body = (await req.json()) as unknown;
    const parsed = parseDispatchCaseCreateInput(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "入力内容を確認してください。", fieldErrors: parsed.fieldErrors }, { status: 400 });
    }

    await ensureDispatchSchema();
    const result = await createDispatchCase(parsed.data, user);
    if (!result.success) {
      return NextResponse.json({ message: result.message, fieldErrors: result.fieldErrors }, { status: 400 });
    }

    return NextResponse.json({ caseId: result.caseId, caseIds: result.caseIds, message: "新規事案を起票しました。" });
  } catch (error) {
    console.error("POST /api/dispatch/cases failed", error);
    return NextResponse.json({ message: "新規事案の起票に失敗しました。" }, { status: 500 });
  }
}
