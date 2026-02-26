import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authContext";
import { db } from "@/lib/db";
import { canTransition, getStatusLabel, isHospitalRequestStatus } from "@/lib/hospitalRequestStatus";

type Params = {
  params: Promise<{ targetId: string }>;
};

type TargetRow = {
  id: number;
  hospital_id: number;
  status: string;
};

type Body = {
  status?: string;
  note?: string;
};

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { targetId: rawTargetId } = await params;
    const targetId = Number(rawTargetId);
    if (!Number.isFinite(targetId)) {
      return NextResponse.json({ message: "Invalid targetId" }, { status: 400 });
    }

    const body = (await req.json()) as Body;
    if (!isHospitalRequestStatus(body.status)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }

    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "HOSPITAL" || !user.hospitalId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const targetRes = await db.query<TargetRow>(
      `
        SELECT id, hospital_id, status
        FROM hospital_request_targets
        WHERE id = $1
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

    await db.query(
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
        ) VALUES ($1, 'hospital_response', $2, $3, $4, $5, NOW())
      `,
      [targetId, target.status, body.status, user.id, body.note ?? null],
    );

    return NextResponse.json({
      ok: true,
      status: body.status,
      statusLabel: getStatusLabel(body.status),
    });
  } catch (error) {
    console.error("PATCH /api/hospitals/requests/[targetId]/status failed", error);
    return NextResponse.json({ message: "受入依頼の更新に失敗しました。" }, { status: 500 });
  }
}

