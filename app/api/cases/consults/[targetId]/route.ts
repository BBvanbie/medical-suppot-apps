import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { authorizeCaseTargetEditAccess, authorizeCaseTargetReadAccess } from "@/lib/caseAccess";
import { db } from "@/lib/db";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";
import { createNotification } from "@/lib/notifications";
import { consumeRateLimit } from "@/lib/rateLimit";
import { recordApiFailureEvent } from "@/lib/systemMonitor";

type Params = {
  params: Promise<{ targetId: string }>;
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
    const access = await authorizeCaseTargetReadAccess(user, targetId);
    if (!access.ok) {
      return NextResponse.json({ message: access.message }, { status: access.status });
    }
    const rateLimit = await consumeRateLimit({
      policyName: "search_read",
      routeKey: "api.cases.consults.get",
      request: _,
      user: user!,
    });
    if (!rateLimit.ok) {
      return NextResponse.json(
        { message: `相談履歴取得の上限に達しました。${rateLimit.retryAfterSeconds} 秒後に再試行してください。` },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }
    const target = access.context;

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
    await recordApiFailureEvent("api.cases.consults.get", error);
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
    const access = await authorizeCaseTargetEditAccess(user, targetId);
    if (!access.ok) {
      return NextResponse.json({ message: access.message }, { status: access.status });
    }
    const rateLimit = await consumeRateLimit({
      policyName: "critical_update",
      routeKey: "api.cases.consults.patch",
      request: req,
      user: user!,
    });
    if (!rateLimit.ok) {
      return NextResponse.json(
        { message: `相談返信の上限に達しました。${rateLimit.retryAfterSeconds} 秒後に再試行してください。` },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }
    const target = access.context;
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
        [target.targetId, user!.id],
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
        [target.targetId, target.status, user!.id, note],
      );

      await createNotification(
        {
          audienceRole: "HOSPITAL",
          mode: target.mode,
          hospitalId: target.hospitalId,
          kind: "consult_comment_from_ems",
          caseId: target.caseId,
          caseUid: target.caseUid,
          targetId: target.targetId,
          title: "Consult comment received",
          body: `A-side comment received for case ${target.caseId}.`,
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
    await recordApiFailureEvent("api.cases.consults.patch", error);
    return NextResponse.json({ message: "Failed to send consult reply." }, { status: 500 });
  }
}
