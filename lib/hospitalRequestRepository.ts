import { db } from "@/lib/db";
import { compareHospitalPriority } from "@/lib/hospitalPriority";
import { getStatusLabel, isHospitalRequestStatus } from "@/lib/hospitalRequestStatus";

type RequestListRow = {
  target_id: number;
  request_id: string;
  case_id: string;
  status: string;
  sent_at: string;
  opened_at: string | null;
  aware_date: string | null;
  aware_time: string | null;
  dispatch_address: string | null;
  team_code: string | null;
  team_name: string | null;
  team_phone: string | null;
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
  aware_date: string | null;
  aware_time: string | null;
  dispatch_address: string | null;
  patient_summary: Record<string, unknown> | null;
  team_code: string | null;
  team_name: string | null;
  team_phone: string | null;
  consult_comment: string | null;
  ems_reply_comment: string | null;
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
  openedAt: string | null;
  awareDate: string;
  awareTime: string;
  dispatchAddress: string;
  fromTeamCode: string | null;
  fromTeamName: string | null;
  fromTeamPhone: string | null;
  selectedDepartments: string[];
};

export type HospitalRequestDetailItem = HospitalRequestListItem & {
  hospitalId: number;
  patientSummary: Record<string, unknown> | null;
  consultComment: string | null;
  emsReplyComment: string | null;
};

export async function listHospitalRequestsForHospital(hospitalId: number, mode: "LIVE" | "TRAINING" = "LIVE"): Promise<HospitalRequestListItem[]> {
  const res = await db.query<RequestListRow>(
    `
      SELECT
        t.id AS target_id,
        r.request_id,
        r.case_id,
        t.status,
        r.sent_at::text AS sent_at,
        t.opened_at::text AS opened_at,
        c.aware_date::text AS aware_date,
        c.aware_time::text AS aware_time,
        c.address AS dispatch_address,
        et.team_code,
        et.team_name,
        et.phone AS team_phone,
        COALESCE(t.selected_departments, '[]'::jsonb)::jsonb AS selected_departments
      FROM hospital_request_targets t
      JOIN hospital_requests r ON r.id = t.hospital_request_id
      LEFT JOIN cases c ON c.case_uid = r.case_uid
      LEFT JOIN emergency_teams et ON et.id = r.from_team_id
      WHERE t.hospital_id = $1
        AND r.mode = $2
      ORDER BY r.sent_at DESC, t.id DESC
    `,
    [hospitalId, mode],
  );

  const allSelectedDepartments = Array.from(
    new Set(
      res.rows.flatMap((row) => row.selected_departments ?? []).filter((value) => typeof value === "string"),
    ),
  );

  const departmentNameByShortName = new Map<string, string>();
  if (allSelectedDepartments.length > 0) {
    const deptRes = await db.query<DepartmentMasterRow>(
      `
        SELECT short_name, name
        FROM medical_departments
        WHERE short_name = ANY($1::text[])
           OR name = ANY($1::text[])
      `,
      [allSelectedDepartments],
    );

    for (const dept of deptRes.rows) {
      departmentNameByShortName.set(dept.short_name, dept.name);
      departmentNameByShortName.set(dept.name, dept.name);
    }
  }

  return res.rows.map((row) => {
    const status = isHospitalRequestStatus(row.status) ? row.status : "UNREAD";
    const selectedDepartments = (row.selected_departments ?? []).map(
      (value) => departmentNameByShortName.get(value) ?? value,
    );

    return {
      targetId: row.target_id,
      requestId: row.request_id,
      caseId: row.case_id,
      status,
      statusLabel: getStatusLabel(status),
      sentAt: row.sent_at,
      openedAt: row.opened_at,
      awareDate: row.aware_date ?? "",
      awareTime: row.aware_time ?? "",
      dispatchAddress: row.dispatch_address ?? "",
      fromTeamCode: row.team_code,
      fromTeamName: row.team_name,
      fromTeamPhone: row.team_phone,
      selectedDepartments,
    };
  }).sort((a, b) => {
    const priority = compareHospitalPriority(
      { status: a.status, sentAt: a.sentAt, openedAt: a.openedAt },
      { status: b.status, sentAt: b.sentAt, openedAt: b.openedAt },
    );
    if (priority !== 0) return priority;
    return a.targetId - b.targetId;
  });
}

export async function getHospitalRequestDetail(targetId: number, mode?: "LIVE" | "TRAINING"): Promise<HospitalRequestDetailItem | null> {
  const values: Array<number | string> = [targetId];
  const modeSql = mode ? `AND r.mode = $2` : "";
  if (mode) values.push(mode);

  const res = await db.query<RequestDetailRow>(
    `
      SELECT
        t.id AS target_id,
        t.hospital_id,
        t.status,
        COALESCE(t.selected_departments, '[]'::jsonb)::jsonb AS selected_departments,
        t.opened_at::text AS opened_at,
        r.request_id,
        r.case_id,
        r.sent_at::text AS sent_at,
        c.aware_date::text AS aware_date,
        c.aware_time::text AS aware_time,
        c.address AS dispatch_address,
        COALESCE(r.patient_summary, '{}'::jsonb)::jsonb AS patient_summary,
        et.team_code,
        et.team_name,
        et.phone AS team_phone,
        consult_event.note AS consult_comment,
        reply_event.note AS ems_reply_comment
      FROM hospital_request_targets t
      JOIN hospital_requests r ON r.id = t.hospital_request_id
      LEFT JOIN cases c ON c.case_uid = r.case_uid
      LEFT JOIN emergency_teams et ON et.id = r.from_team_id
      LEFT JOIN LATERAL (
        SELECT e.note
        FROM hospital_request_events e
        WHERE e.target_id = t.id
          AND e.event_type = 'hospital_response'
          AND e.to_status = 'NEGOTIATING'
          AND e.note IS NOT NULL
          AND btrim(e.note) <> ''
        ORDER BY e.acted_at DESC, e.id DESC
        LIMIT 1
      ) consult_event ON TRUE
      LEFT JOIN LATERAL (
        SELECT e.note
        FROM hospital_request_events e
        WHERE e.target_id = t.id
          AND e.event_type = 'paramedic_consult_reply'
          AND e.note IS NOT NULL
          AND btrim(e.note) <> ''
        ORDER BY e.acted_at DESC, e.id DESC
        LIMIT 1
      ) reply_event ON TRUE
      WHERE t.id = $1
        ${modeSql}
      LIMIT 1
    `,
    values,
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
    openedAt: row.opened_at,
    awareDate: row.aware_date ?? "",
    awareTime: row.aware_time ?? "",
    dispatchAddress: row.dispatch_address ?? "",
    status,
    statusLabel: getStatusLabel(status),
    selectedDepartments: selectedDepartmentLabels,
    patientSummary: row.patient_summary ?? null,
    fromTeamCode: row.team_code,
    fromTeamName: row.team_name,
    fromTeamPhone: row.team_phone,
    consultComment: row.consult_comment,
    emsReplyComment: row.ems_reply_comment,
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

