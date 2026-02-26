import { notFound } from "next/navigation";
import { HospitalPortalShell } from "@/components/hospitals/HospitalPortalShell";
import { HospitalRequestDetail } from "@/components/hospitals/HospitalRequestDetail";
import { getAuthenticatedUser } from "@/lib/authContext";
import { db } from "@/lib/db";
import { getHospitalOperator } from "@/lib/hospitalOperator";
import { getStatusLabel, isHospitalRequestStatus } from "@/lib/hospitalRequestStatus";

type Params = {
  params: Promise<{ targetId: string }>;
};

type DetailRow = {
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

async function loadDetail(targetId: number, userHospitalId: number, userId: number) {
  const res = await db.query<DetailRow>(
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
  if (!row || row.hospital_id !== userHospitalId) return null;

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
      [targetId, userId],
    );
    await db.query(
      `
        INSERT INTO hospital_request_events (
          target_id, event_type, from_status, to_status, acted_by_user_id, acted_at
        ) VALUES ($1, 'opened_detail', 'UNREAD', 'READ', $2, NOW())
      `,
      [targetId, userId],
    );
    row.status = "READ";
  }

  const status = isHospitalRequestStatus(row.status) ? row.status : "UNREAD";
  return {
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
  };
}

export default async function HospitalRequestDetailPage({ params }: Params) {
  const { targetId: rawTargetId } = await params;
  const targetId = Number(rawTargetId);
  if (!Number.isFinite(targetId)) notFound();

  const [user, operator] = await Promise.all([getAuthenticatedUser(), getHospitalOperator()]);
  if (!user || user.role !== "HOSPITAL" || !user.hospitalId) notFound();

  const detail = await loadDetail(targetId, user.hospitalId, user.id);
  if (!detail) notFound();

  return (
    <HospitalPortalShell hospitalName={operator.name} hospitalCode={operator.code}>
      <div className="mx-auto w-full max-w-[1320px]">
        <HospitalRequestDetail detail={detail} />
      </div>
    </HospitalPortalShell>
  );
}
