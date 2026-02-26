import { db } from "@/lib/db";
import { getStatusLabel, isHospitalRequestStatus } from "@/lib/hospitalRequestStatus";

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

type RequestDetailRow = {
  target_id: number;
  hospital_id: number;
  status: string;
  selected_departments: string[] | null;
  opened_at: string | null;
  request_id: string;
  case_id: string;
  sent_at: string;
  patient_summary: Record<string, unknown> | null;
  team_code: string | null;
  team_name: string | null;
};

type DepartmentMasterRow = {
  short_name: string;
  name: string;
};

export type HospitalRequestListItem = {
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

export type HospitalRequestDetailItem = HospitalRequestListItem & {
  openedAt: string | null;
  hospitalId: number;
  patientSummary: Record<string, unknown> | null;
};

export async function listHospitalRequestsForHospital(hospitalId: number): Promise<HospitalRequestListItem[]> {
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
    [hospitalId],
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

export async function getHospitalRequestDetail(targetId: number): Promise<HospitalRequestDetailItem | null> {
  const res = await db.query<RequestDetailRow>(
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
        COALESCE(r.patient_summary, '{}'::jsonb)::jsonb AS patient_summary,
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
  if (!row) return null;

  const status = isHospitalRequestStatus(row.status) ? row.status : "UNREAD";
  const selectedDepartments = row.selected_departments ?? [];
  let selectedDepartmentLabels = selectedDepartments;

  if (selectedDepartments.length > 0) {
    const deptRes = await db.query<DepartmentMasterRow>(
      `
        SELECT short_name, name
        FROM medical_departments
        WHERE short_name = ANY($1::text[])
           OR name = ANY($1::text[])
      `,
      [selectedDepartments],
    );

    if (deptRes.rows.length > 0) {
      const byShortName = new Map<string, string>();
      const byName = new Map<string, string>();
      for (const dept of deptRes.rows) {
        byShortName.set(dept.short_name, dept.name);
        byName.set(dept.name, dept.name);
      }
      selectedDepartmentLabels = selectedDepartments.map(
        (value) => byShortName.get(value) ?? byName.get(value) ?? value,
      );
    }
  }

  return {
    targetId: row.target_id,
    hospitalId: row.hospital_id,
    requestId: row.request_id,
    caseId: row.case_id,
    sentAt: row.sent_at,
    status,
    statusLabel: getStatusLabel(status),
    openedAt: row.opened_at,
    selectedDepartments: selectedDepartmentLabels,
    patientSummary: row.patient_summary ?? null,
    fromTeamCode: row.team_code,
    fromTeamName: row.team_name,
  };
}

export async function markHospitalRequestAsRead(targetId: number, userId: number): Promise<boolean> {
  const updateRes = await db.query(
    `
      UPDATE hospital_request_targets
      SET status = 'READ',
          opened_at = COALESCE(opened_at, NOW()),
          updated_by_user_id = $2,
          updated_at = NOW()
      WHERE id = $1
        AND status = 'UNREAD'
      RETURNING id
    `,
    [targetId, userId],
  );

  if (updateRes.rowCount === 0) return false;

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
    [targetId, userId],
  );

  return true;
}
