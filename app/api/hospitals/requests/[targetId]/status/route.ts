import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authContext";
import { db } from "@/lib/db";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";
import { canTransition, getStatusLabel, isHospitalRequestStatus } from "@/lib/hospitalRequestStatus";
import { createNotification } from "@/lib/notifications";

type Params = {
  params: Promise<{ targetId: string }>;
};

type TargetRow = {
  id: number;
  hospital_id: number;
  status: string;
  case_id: string;
  from_team_id: number | null;
};

type Body = {
  status?: string;
  note?: string;
};

export async function PATCH(req: Request, { params }: Params) {
  try {
    await ensureHospitalRequestTables();
    const { targetId: rawTargetId } = await params;
    const targetId = Number(rawTargetId);
    if (!Number.isFinite(targetId)) {
      return NextResponse.json({ message: "Invalid targetId" }, { status: 400 });
    }

    const body = (await req.json()) as Body;
    if (!isHospitalRequestStatus(body.status)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }
    if (body.status === "NEGOTIATING" && !String(body.note ?? "").trim()) {
      return NextResponse.json({ message: "Consult note is required." }, { status: 400 });
    }

    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "HOSPITAL" || !user.hospitalId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const targetRes = await db.query<TargetRow>(
      `
        SELECT
          t.id,
          t.hospital_id,
          t.status,
          r.case_id,
          r.from_team_id
        FROM hospital_request_targets t
        JOIN hospital_requests r ON r.id = t.hospital_request_id
        WHERE t.id = $1
        LIMIT 1
      `,
      [targetId],
    );
    const target = targetRes.rows[0];
    if (!target) return NextResponse.json({ message: "Not found" }, { status: 404 });
    if (target.hospital_id !== user.hospitalId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    if (!isHospitalRequestStatus(target.status)) {
      return NextResponse.json({ message: "Invalid current status" }, { status: 409 });
    }
    if (!canTransition(target.status, body.status, "HOSPITAL")) {
      return NextResponse.json({ message: "Transition not allowed" }, { status: 400 });
    }

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `
          UPDATE hospital_request_targets
          SET status = $2,
              responded_at = CASE
                WHEN $2 IN ('NEGOTIATING', 'ACCEPTABLE', 'NOT_ACCEPTABLE') THEN NOW()
                ELSE responded_at
              END,
              updated_by_user_id = $3,
              updated_at = NOW()
          WHERE id = $1
        `,
        [targetId, body.status, user.id],
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
          ) VALUES ($1, 'hospital_response', $2, $3, $4, $5, NOW())
        `,
        [targetId, target.status, body.status, user.id, body.note ?? null],
      );

      if (body.status === "NOT_ACCEPTABLE") {
        await client.query(
          `
            DELETE FROM hospital_patients
            WHERE target_id = $1
          `,
          [targetId],
        );
      }

      if (target.from_team_id) {
        await createNotification(
          {
            audienceRole: "EMS",
            teamId: target.from_team_id,
            kind: body.status === "NEGOTIATING" ? "consult_status_changed" : "hospital_status_changed",
            caseId: target.case_id,
            targetId: target.id,
            title: body.status === "NEGOTIATING" ? "要相談ステータス通知" : "病院ステータス更新通知",
            body:
              body.status === "NEGOTIATING"
                ? `事案 ${target.case_id} が要相談になりました。`
                : `事案 ${target.case_id} の病院ステータスが更新されました。`,
            menuKey: "cases-list",
            tabKey: body.status === "NEGOTIATING" ? "consults" : "selection-history",
          },
          client,
        );
      }

      await client.query("COMMIT");
    } catch (innerError) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw innerError;
    } finally {
      client.release();
    }

    return NextResponse.json({
      ok: true,
      status: body.status,
      statusLabel: getStatusLabel(body.status),
    });
  } catch (error) {
    console.error("PATCH /api/hospitals/requests/[targetId]/status failed", error);
    return NextResponse.json({ message: "Failed to update hospital request status." }, { status: 500 });
  }
}
