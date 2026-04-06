import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { authorizeCaseReadAccess } from "@/lib/caseAccess";
import { ensureCasesColumns } from "@/lib/casesSchema";
import { db } from "@/lib/db";

type Params = {
  params: Promise<{ caseId: string }>;
};

export async function GET(_: Request, { params }: Params) {
  try {
    await ensureCasesColumns();

    const { caseId } = await params;
    if (!caseId) return NextResponse.json({ message: "caseId is required." }, { status: 400 });

    const user = await getAuthenticatedUser();
    const access = await authorizeCaseReadAccess(user, caseId);
    if (!access.ok) {
      return NextResponse.json({ message: access.message }, { status: access.status });
    }

    const result = await db.query<{ case_payload: unknown; updated_at: string | null }>(
      `
        SELECT case_payload, updated_at::text AS updated_at
        FROM cases
        WHERE case_uid = $1 OR case_id = $1
        ORDER BY CASE WHEN case_uid = $1 THEN 0 ELSE 1 END
        LIMIT 1
      `,
      [caseId],
    );
    const row = result.rows[0];
    if (!row) return NextResponse.json({ message: "Not found" }, { status: 404 });

    return NextResponse.json({
      caseId: access.context.caseId,
      caseUid: access.context.caseUid,
      updatedAt: row.updated_at,
      payload: row.case_payload ?? null,
    });
  } catch (error) {
    console.error("GET /api/cases/[caseId]/offline-conflict failed", error);
    return NextResponse.json({ message: "競合比較データの取得に失敗しました。" }, { status: 500 });
  }
}
