import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { ensureAuditLogSchema, writeAuditLog } from "@/lib/auditLog";
import { authorizeHospitalTargetAccess } from "@/lib/caseAccess";
import { db } from "@/lib/db";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";
import { getStatusLabel, isHospitalRequestStatus } from "@/lib/hospitalRequestStatus";
import { createNotification } from "@/lib/notifications";

type Params = {
  params: Promise<{ targetId: string }>;
};

type TargetRow = {
  id: number;
  hospital_id: number;
  status: string;
  case_id: string;
  case_uid: string;
  from_team_id: number | null;
};

type ConsultMessageRow = {
  id: number;
  event_type: string;
  acted_at: string;
  note: string;
};

type Body = {
  note?: unknown;
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
    const access = await authorizeHospitalTargetAccess(user, targetId);
    if (!access.ok) {
      return NextResponse.json({ message: access.message }, { status: access.status });
    }

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

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("GET /api/hospitals/requests/[targetId]/consult failed", error);
    return NextResponse.json({ message: "相談履歴の取得に失敗しました。" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    await ensureHospitalRequestTables();
    await ensureAuditLogSchema();

    const { targetId: rawTargetId } = await params;
    const targetId = Number(rawTargetId);
    if (!Number.isFinite(targetId)) {
      return NextResponse.json({ message: "Invalid targetId" }, { status: 400 });
    }

    const body = ((await req.json().catch(() => ({}))) ?? {}) as Body;
    const note = typeof body.note === "string" ? body.note.trim() : "";
    if (!note) {
      return NextResponse.json({ message: "Consult note is required." }, { status: 400 });
    }

    const user = await getAuthenticatedUser();
    const access = await authorizeHospitalTargetAccess(user, targetId);
    if (!access.ok) {
      return NextResponse.json({ message: access.message }, { status: access.status });
    }

    const targetRes = await db.query<TargetRow>(
      `
        SELECT t.id, t.hospital_id, t.status, r.case_id, r.case_uid, r.from_team_id
        FROM hospital_request_targets t
        JOIN hospital_requests r ON r.id = t.hospital_request_id
        WHERE t.id = $1
        LIMIT 1
      `,
      [targetId],
    );
    const target = targetRes.rows[0];
    if (!target) return NextResponse.json({ message: "Not found" }, { status: 404 });
    if (!isHospitalRequestStatus(target.status)) {
      return NextResponse.json({ message: "Invalid current status" }, { status: 409 });
    }
    if (target.status === "TRANSPORT_DECLINED" || target.status === "TRANSPORT_DECIDED") {
      return NextResponse.json({ message: "Consult is not allowed for terminal requests." }, { status: 409 });
    }

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `
          UPDATE hospital_request_targets
          SET status = 'NEGOTIATING',
              responded_at = COALESCE(responded_at, NOW()),
              updated_by_user_id = $2,
              updated_at = NOW()
          WHERE id = $1
        `,
        [targetId, user!.id],
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
          ) VALUES ($1, 'hospital_response', $2, 'NEGOTIATING', $3, $4, NOW())
        `,
        [targetId, target.status, user!.id, note],
      );

      if (target.from_team_id) {
        await createNotification(
          {
            audienceRole: "EMS",
            teamId: target.from_team_id,
            kind: "consult_status_changed",
            caseId: target.case_id,
            caseUid: target.case_uid,
            targetId,
            title: "相談対応あり",
            body: `事案 ${target.case_id} に病院から相談コメントが届きました。`,
            menuKey: "cases-list",
            tabKey: "consults",
          },
          client,
        );
      }

      await writeAuditLog(
        {
          actor: user,
          action: "hospitals.requests.consult.send",
          targetType: "hospital_request_target",
          targetId: String(targetId),
          before: { status: target.status, statusLabel: getStatusLabel(target.status) },
          after: { status: "NEGOTIATING", statusLabel: getStatusLabel("NEGOTIATING"), note },
          metadata: { caseId: target.case_id, caseUid: target.case_uid },
        },
        client,
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }

    return NextResponse.json({ ok: true, status: "NEGOTIATING", statusLabel: getStatusLabel("NEGOTIATING") });
  } catch (error) {
    console.error("PATCH /api/hospitals/requests/[targetId]/consult failed", error);
    return NextResponse.json({ message: "相談コメントの送信に失敗しました。" }, { status: 500 });
  }
}