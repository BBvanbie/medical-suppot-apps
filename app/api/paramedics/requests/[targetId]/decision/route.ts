import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authContext";
import { db } from "@/lib/db";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";
import { canTransition, getStatusLabel, isHospitalRequestStatus } from "@/lib/hospitalRequestStatus";

type Params = {
  params: Promise<{ targetId: string }>;
};

type Body = {
  status?: string;
  note?: string;
};

type TargetRow = {
  id: number;
  status: string;
  hospital_id: number;
  hospital_request_id: number;
};

type RequestRow = {
  request_id: string;
  case_id: string;
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
    if (body.status !== "TRANSPORT_DECIDED" && body.status !== "TRANSPORT_DECLINED") {
      return NextResponse.json({ message: "Invalid decision status" }, { status: 400 });
    }

    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "EMS") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const targetRes = await db.query<TargetRow>(
      `
        SELECT id, status, hospital_id, hospital_request_id
        FROM hospital_request_targets
        WHERE id = $1
        LIMIT 1
      `,
      [targetId],
    );
    const target = targetRes.rows[0];
    if (!target) return NextResponse.json({ message: "Not found" }, { status: 404 });
    if (!isHospitalRequestStatus(target.status)) {
      return NextResponse.json({ message: "Invalid current status" }, { status: 409 });
    }
    if (!canTransition(target.status, body.status, "EMS")) {
      return NextResponse.json({ message: "Transition not allowed" }, { status: 400 });
    }

    const requestRes = await db.query<RequestRow>(
      `
        SELECT request_id, case_id
        FROM hospital_requests
        WHERE id = $1
        LIMIT 1
      `,
      [target.hospital_request_id],
    );
    const requestRow = requestRes.rows[0];
    if (!requestRow) return NextResponse.json({ message: "Not found" }, { status: 404 });

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `
          UPDATE hospital_request_targets
          SET status = $2,
              decided_at = NOW(),
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
          ) VALUES ($1, 'paramedic_decision', $2, $3, $4, $5, NOW())
        `,
        [targetId, target.status, body.status, user.id, body.note ?? null],
      );

      if (body.status === "TRANSPORT_DECIDED") {
        await client.query(
          `
            INSERT INTO hospital_patients (
              target_id,
              hospital_id,
              case_id,
              request_id,
              status,
              updated_at
            ) VALUES ($1, $2, $3, $4, 'TRANSPORT_DECIDED', NOW())
            ON CONFLICT (target_id)
            DO UPDATE SET
              status = EXCLUDED.status,
              updated_at = NOW()
          `,
          [targetId, target.hospital_id, requestRow.case_id, requestRow.request_id],
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }

    return NextResponse.json({
      ok: true,
      status: body.status,
      statusLabel: getStatusLabel(body.status),
    });
  } catch (error) {
    console.error("PATCH /api/paramedics/requests/[targetId]/decision failed", error);
    return NextResponse.json({ message: "搬送判断の更新に失敗しました。" }, { status: 500 });
  }
}
