import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { db } from "@/lib/db";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";

type Params = {
  params: Promise<{ targetId: string }>;
};

type TargetRow = {
  id: number;
  status: string;
};

type ConsultMessageRow = {
  id: number;
  event_type: string;
  acted_at: string;
  note: string;
};

type Body = {
  note?: string;
};

export async function GET(_: Request, { params }: Params) {
  try {
    await ensureHospitalRequestTables();
    const { targetId: rawTargetId } = await params;
    const targetId = Number(rawTargetId);
    if (!Number.isFinite(targetId)) {
      return NextResponse.json({ message: "Invalid targetId" }, { status: 400 });
    }

    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "EMS") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const targetRes = await db.query<TargetRow>(
      `
        SELECT id, status
        FROM hospital_request_targets
        WHERE id = $1
        LIMIT 1
      `,
      [targetId],
    );
    const target = targetRes.rows[0];
    if (!target) return NextResponse.json({ message: "Not found" }, { status: 404 });

    const eventRes = await db.query<ConsultMessageRow>(
      `
        SELECT
          id,
          event_type,
          acted_at::text AS acted_at,
          note
        FROM hospital_request_events
        WHERE target_id = $1
          AND note IS NOT NULL
          AND btrim(note) <> ''
          AND (
            (event_type = 'hospital_response' AND to_status = 'NEGOTIATING')
            OR event_type = 'paramedic_consult_reply'
          )
        ORDER BY acted_at ASC, id ASC
      `,
      [targetId],
    );

    const messages = eventRes.rows.map((row) => ({
      id: row.id,
      actor: row.event_type === "paramedic_consult_reply" ? "A" : "HP",
      actedAt: row.acted_at,
      note: row.note,
    }));

    return NextResponse.json({ status: target.status, messages });
  } catch (error) {
    console.error("GET /api/cases/consults/[targetId] failed", error);
    return NextResponse.json({ message: "相談履歴の取得に失敗しました。" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    await ensureHospitalRequestTables();
    const { targetId: rawTargetId } = await params;
    const targetId = Number(rawTargetId);
    if (!Number.isFinite(targetId)) {
      return NextResponse.json({ message: "Invalid targetId" }, { status: 400 });
    }

    const body = (await req.json()) as Body;
    const note = String(body.note ?? "").trim();
    if (!note) {
      return NextResponse.json({ message: "Reply note is required." }, { status: 400 });
    }

    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "EMS") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const targetRes = await db.query<TargetRow>(
      `
        SELECT id, status
        FROM hospital_request_targets
        WHERE id = $1
        LIMIT 1
      `,
      [targetId],
    );
    const target = targetRes.rows[0];
    if (!target) return NextResponse.json({ message: "Not found" }, { status: 404 });
    if (target.status !== "NEGOTIATING") {
      return NextResponse.json({ message: "Consult reply is allowed only for negotiating status." }, { status: 409 });
    }

    await db.query(
      `
        UPDATE hospital_request_targets
        SET updated_by_user_id = $2,
            updated_at = NOW()
        WHERE id = $1
      `,
      [targetId, user.id],
    );

    await db.query(
      `
        INSERT INTO hospital_request_events (
          target_id,
          event_type,
          from_status,
          to_status,
          acted_by_user_id,
          note,
          acted_at
        ) VALUES ($1, 'paramedic_consult_reply', $2, $2, $3, $4, NOW())
      `,
      [targetId, target.status, user.id, note],
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/cases/consults/[targetId] failed", error);
    return NextResponse.json({ message: "相談回答の送信に失敗しました。" }, { status: 500 });
  }
}
