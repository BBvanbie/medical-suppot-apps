import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { db } from "@/lib/db";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";
import { createNotification } from "@/lib/notifications";

type Params = {
  params: Promise<{ targetId: string }>;
};

type TargetRow = {
  id: number;
  status: string;
  hospital_id: number;
  case_id: string;
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
        SELECT
          t.id,
          t.status,
          t.hospital_id,
          r.case_id
        FROM hospital_request_targets t
        JOIN hospital_requests r ON r.id = t.hospital_request_id
        WHERE t.id = $1
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
    return NextResponse.json({ message: "Failed to fetch consult messages." }, { status: 500 });
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
        SELECT
          t.id,
          t.status,
          t.hospital_id,
          r.case_id
        FROM hospital_request_targets t
        JOIN hospital_requests r ON r.id = t.hospital_request_id
        WHERE t.id = $1
        LIMIT 1
      `,
      [targetId],
    );
    const target = targetRes.rows[0];
    if (!target) return NextResponse.json({ message: "Not found" }, { status: 404 });
    if (target.status !== "NEGOTIATING") {
      return NextResponse.json({ message: "Consult reply is allowed only for negotiating status." }, { status: 409 });
    }

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `
          UPDATE hospital_request_targets
          SET updated_by_user_id = $2,
              updated_at = NOW()
          WHERE id = $1
        `,
        [targetId, user.id],
      );

      await client.query(
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

      await createNotification(
        {
          audienceRole: "HOSPITAL",
          hospitalId: target.hospital_id,
          kind: "consult_comment_from_ems",
          caseId: target.case_id,
          targetId,
          title: "Consult comment received",
          body: `A-side comment received for case ${target.case_id}.`,
          menuKey: "hospitals-consults",
        },
        client,
      );

      await client.query("COMMIT");
    } catch (innerError) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw innerError;
    } finally {
      client.release();
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/cases/consults/[targetId] failed", error);
    return NextResponse.json({ message: "Failed to send consult reply." }, { status: 500 });
  }
}
