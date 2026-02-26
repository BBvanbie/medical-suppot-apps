import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authContext";
import { db } from "@/lib/db";
import { getStatusLabel, isHospitalRequestStatus } from "@/lib/hospitalRequestStatus";

type TargetRow = {
  target_id: number;
  hospital_id: number;
  status: string;
  selected_departments: string[] | null;
  opened_at: string | null;
  request_id: string;
  case_id: string;
  sent_at: string;
  team_code: string | null;
  team_name: string | null;
};

type Params = {
  params: Promise<{ targetId: string }>;
};

export async function GET(_: Request, { params }: Params) {
  try {
    const { targetId: rawTargetId } = await params;
    const targetId = Number(rawTargetId);
    if (!Number.isFinite(targetId)) {
      return NextResponse.json({ message: "Invalid targetId" }, { status: 400 });
    }

    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "HOSPITAL" || !user.hospitalId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const res = await db.query<TargetRow>(
      `
        SELECT
          t.id AS target_id,
          t.hospital_id,
          t.status,
          COALESCE(t.selected_departments, '[]'::jsonb)::jsonb AS selected_departments,
          t.opened_at::text,
          r.request_id,
          r.case_id,
          r.sent_at::text,
          et.team_code,
          et.team_name
        FROM hospital_request_targets t
        JOIN hospital_requests r ON r.id = t.hospital_request_id
        LEFT JOIN emergency_teams et ON et.id = r.from_team_id
        WHERE t.id = $1
        LIMIT 1
      `,
      [targetId],
    );

    const row = res.rows[0];
    if (!row) return NextResponse.json({ message: "Not found" }, { status: 404 });
    if (row.hospital_id !== user.hospitalId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (row.status === "UNREAD") {
      await db.query(
        `
          UPDATE hospital_request_targets
          SET status = 'READ',
              opened_at = COALESCE(opened_at, NOW()),
              updated_by_user_id = $2,
              updated_at = NOW()
          WHERE id = $1
            AND status = 'UNREAD'
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
            acted_at
          ) VALUES ($1, 'opened_detail', 'UNREAD', 'READ', $2, NOW())
        `,
        [targetId, user.id],
      );
      row.status = "READ";
    }

    const status = isHospitalRequestStatus(row.status) ? row.status : "UNREAD";
    return NextResponse.json({
      targetId: row.target_id,
      requestId: row.request_id,
      caseId: row.case_id,
      sentAt: row.sent_at,
      status,
      statusLabel: getStatusLabel(status),
      openedAt: row.opened_at,
      selectedDepartments: row.selected_departments ?? [],
      fromTeamCode: row.team_code,
      fromTeamName: row.team_name,
    });
  } catch (error) {
    console.error("GET /api/hospitals/requests/[targetId] failed", error);
    return NextResponse.json({ message: "受入依頼詳細の取得に失敗しました。" }, { status: 500 });
  }
}

