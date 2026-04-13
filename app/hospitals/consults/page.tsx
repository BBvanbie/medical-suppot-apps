import { HospitalConsultCasesTable } from "@/components/hospitals/HospitalConsultCasesTable";
import { HospitalListSummaryStrip } from "@/components/hospitals/HospitalListSummaryStrip";
import { HospitalPortalShell } from "@/components/hospitals/HospitalPortalShell";
import { ManualRefreshButton } from "@/components/shared/ManualRefreshButton";
import { getAuthenticatedUser } from "@/lib/authContext";
import {
  compareHospitalPriority,
  getHospitalDepartmentPrioritySummary,
  getHospitalNextActionLabel,
} from "@/lib/hospitalPriority";
import { getHospitalOperator } from "@/lib/hospitalOperator";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";
import { getHospitalOperationsSettings } from "@/lib/hospitalSettingsRepository";
import { db } from "@/lib/db";

type Row = {
  target_id: number;
  case_id: string;
  team_name: string | null;
  aware_date: string | null;
  aware_time: string | null;
  dispatch_address: string | null;
  patient_name: string | null;
  patient_age: string | null;
  patient_gender: string | null;
  selected_departments: string[] | null;
  status: string;
  latest_hp_comment: string | null;
  latest_ems_comment: string | null;
  sent_at: string;
  latest_consult_at: string | null;
};

async function getRows(): Promise<Row[]> {
  await ensureHospitalRequestTables();
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "HOSPITAL" || !user.hospitalId) return [];

  const res = await db.query<Row>(
    `
      SELECT
        t.id AS target_id,
        r.case_id,
        et.team_name,
        c.aware_date::text AS aware_date,
        c.aware_time::text AS aware_time,
        c.address AS dispatch_address,
        NULLIF(btrim(COALESCE(r.patient_summary->>'name', '')), '') AS patient_name,
        NULLIF(btrim(COALESCE(r.patient_summary->>'age', '')), '') AS patient_age,
        NULLIF(btrim(COALESCE(r.patient_summary->>'gender', '')), '') AS patient_gender,
        COALESCE(t.selected_departments, '[]'::jsonb)::jsonb AS selected_departments,
        t.status,
        hp_event.note AS latest_hp_comment,
        ems_event.note AS latest_ems_comment,
        r.sent_at::text AS sent_at,
        consult_event.latest_consult_at::text AS latest_consult_at
      FROM hospital_request_targets t
      JOIN hospital_requests r ON r.id = t.hospital_request_id
      LEFT JOIN emergency_teams et ON et.id = r.from_team_id
      LEFT JOIN cases c ON c.case_uid = r.case_uid
      LEFT JOIN LATERAL (
        SELECT e.note
        FROM hospital_request_events e
        WHERE e.target_id = t.id
          AND e.event_type = 'hospital_response'
          AND e.note IS NOT NULL
          AND btrim(e.note) <> ''
        ORDER BY e.acted_at DESC, e.id DESC
        LIMIT 1
      ) hp_event ON TRUE
      LEFT JOIN LATERAL (
        SELECT e.note
        FROM hospital_request_events e
        WHERE e.target_id = t.id
          AND e.event_type = 'paramedic_consult_reply'
          AND e.note IS NOT NULL
          AND btrim(e.note) <> ''
        ORDER BY e.acted_at DESC, e.id DESC
        LIMIT 1
      ) ems_event ON TRUE
      LEFT JOIN LATERAL (
        SELECT e.acted_at AS latest_consult_at
        FROM hospital_request_events e
        WHERE e.target_id = t.id
          AND e.event_type = 'hospital_response'
          AND e.to_status = 'NEGOTIATING'
        ORDER BY e.acted_at DESC, e.id DESC
        LIMIT 1
      ) consult_event ON TRUE
      WHERE t.hospital_id = $1
        AND t.status IN ('NEGOTIATING', 'TRANSPORT_DECIDED', 'TRANSPORT_DECLINED')
        AND r.mode = $2
      ORDER BY t.updated_at DESC, t.id DESC
    `,
    [user.hospitalId, user.currentMode],
  );

  return res.rows.sort((a, b) => {
    const priority = compareHospitalPriority(
      { status: a.status, selectedDepartments: a.selected_departments, sentAt: a.sent_at, consultAt: a.latest_consult_at },
      { status: b.status, selectedDepartments: b.selected_departments, sentAt: b.sent_at, consultAt: b.latest_consult_at },
    );
    if (priority !== 0) return priority;
    return a.target_id - b.target_id;
  });
}

async function getConsultTemplate(): Promise<string> {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "HOSPITAL" || !user.hospitalId) return "";
  const settings = await getHospitalOperationsSettings(user.hospitalId);
  return settings.consultTemplate;
}

export default async function HospitalConsultsPage() {
  const [user, operator, rows, consultTemplate] = await Promise.all([
    getAuthenticatedUser(),
    getHospitalOperator(),
    getRows(),
    getConsultTemplate(),
  ]);

  const priorityCount = rows.filter((row) => getHospitalDepartmentPrioritySummary(row.selected_departments)).length;
  const activeConsultCount = rows.filter((row) => row.status === "NEGOTIATING").length;
  const emsReplyCount = rows.filter((row) => Boolean(row.latest_ems_comment?.trim())).length;
  const leadAction = rows[0] ? getHospitalNextActionLabel(rows[0].status) : "相談待ち";

  return (
    <HospitalPortalShell hospitalName={operator.name} hospitalCode={operator.code} currentMode={user?.currentMode ?? "LIVE"}>
      <div className="w-full min-w-0">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="portal-eyebrow portal-eyebrow--hospital">CONSULTS</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">相談事案一覧</h1>
            <p className="mt-1 text-sm text-slate-500">要相談の送信履歴を一覧で表示します。</p>
          </div>
          <ManualRefreshButton />
        </header>
        <HospitalListSummaryStrip
          items={[
            { label: "TOTAL CONSULTS", value: rows.length, hint: "現在の表示件数" },
            { label: "PRIORITY DEPTS", value: priorityCount, hint: "救命 / CCU / 脳卒中を含む案件", tone: "priority" },
            { label: "ACTIVE CONSULT", value: activeConsultCount, hint: leadAction, tone: "action" },
            { label: "EMS REPLIES", value: emsReplyCount, hint: "A側の返信が入っている案件", tone: "warning" },
          ]}
        />
        <HospitalConsultCasesTable rows={rows} consultTemplate={consultTemplate} />
      </div>
    </HospitalPortalShell>
  );
}
