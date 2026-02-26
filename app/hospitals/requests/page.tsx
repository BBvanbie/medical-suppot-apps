import { HospitalPortalShell } from "@/components/hospitals/HospitalPortalShell";
import { HospitalRequestsTable } from "@/components/hospitals/HospitalRequestsTable";
import { getAuthenticatedUser } from "@/lib/authContext";
import { db } from "@/lib/db";
import { getHospitalOperator } from "@/lib/hospitalOperator";
import { getStatusLabel, isHospitalRequestStatus } from "@/lib/hospitalRequestStatus";

type RequestRow = {
  targetId: number;
  requestId: string;
  caseId: string;
  status: string;
  statusLabel: string;
  sentAt: string;
  fromTeamCode: string | null;
  fromTeamName: string | null;
  selectedDepartments: string[];
};

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

async function getRows(): Promise<RequestRow[]> {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "HOSPITAL" || !user.hospitalId) return [];

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

  return res.rows.map((row: RequestListRow) => {
    const status = isHospitalRequestStatus(row.status) ? row.status : "UNREAD";
    return {
      targetId: row.target_id,
      requestId: row.request_id,
      caseId: row.case_id,
      status,
      statusLabel: getStatusLabel(status),
      sentAt: row.sent_at,
      fromTeamCode: row.team_code,
      fromTeamName: row.team_name,
      selectedDepartments: row.selected_departments ?? [],
    };
  });
}

export default async function HospitalRequestsPage() {
  const [operator, rows] = await Promise.all([getHospitalOperator(), getRows()]);

  return (
    <HospitalPortalShell hospitalName={operator.name} hospitalCode={operator.code}>
      <div className="mx-auto w-full max-w-[1320px]">
        <header className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">REQUESTS</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">受入依頼一覧</h1>
          <p className="mt-1 text-sm text-slate-500">救急隊から送信された自院宛の受入依頼を表示します。</p>
        </header>
        <HospitalRequestsTable rows={rows} />
      </div>
    </HospitalPortalShell>
  );
}
