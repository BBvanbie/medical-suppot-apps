import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authContext";
import { db } from "@/lib/db";
import { HospitalRequestStatus, getStatusLabel, isHospitalRequestStatus } from "@/lib/hospitalRequestStatus";

type RequestListRow = {
  target_id: number;
  request_id: string;
  case_id: string;
  status: string;
  sent_at: string;
  team_code: string | null;
  team_name: string | null;
  selected_departments: string[] | null;
};

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "HOSPITAL" || !user.hospitalId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const res = await db.query<RequestListRow>(
      `
        SELECT
          t.id AS target_id,
          r.request_id,
          r.case_id,
          t.status,
          r.sent_at::text,
          et.team_code,
          et.team_name,
          COALESCE(t.selected_departments, '[]'::jsonb)::jsonb AS selected_departments
        FROM hospital_request_targets t
        JOIN hospital_requests r ON r.id = t.hospital_request_id
        LEFT JOIN emergency_teams et ON et.id = r.from_team_id
        WHERE t.hospital_id = $1
        ORDER BY r.sent_at DESC, t.id DESC
      `,
      [user.hospitalId],
    );

    const rows = res.rows.map((row: RequestListRow) => {
      const status = isHospitalRequestStatus(row.status) ? row.status : "UNREAD";
      return {
        targetId: row.target_id,
        requestId: row.request_id,
        caseId: row.case_id,
        status,
        statusLabel: getStatusLabel(status as HospitalRequestStatus),
        sentAt: row.sent_at,
        fromTeamCode: row.team_code,
        fromTeamName: row.team_name,
        selectedDepartments: row.selected_departments ?? [],
      };
    });

    return NextResponse.json({ rows });
  } catch (error) {
    console.error("GET /api/hospitals/requests failed", error);
    return NextResponse.json({ message: "受入依頼一覧の取得に失敗しました。" }, { status: 500 });
  }
}

