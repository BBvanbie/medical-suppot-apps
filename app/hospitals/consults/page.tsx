import { AutoRefreshOnInterval } from "@/components/shared/AutoRefreshOnInterval";
import { HospitalConsultCasesTable } from "@/components/hospitals/HospitalConsultCasesTable";
import { HospitalPortalShell } from "@/components/hospitals/HospitalPortalShell";
import { getAuthenticatedUser } from "@/lib/authContext";
import { db } from "@/lib/db";
import { getHospitalOperator } from "@/lib/hospitalOperator";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";
import { getHospitalOperationsSettings } from "@/lib/hospitalSettingsRepository";

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
        r.sent_at::text AS sent_at
      FROM hospital_request_targets t
      JOIN hospital_requests r ON r.id = t.hospital_request_id
      LEFT JOIN emergency_teams et ON et.id = r.from_team_id
      LEFT JOIN cases c ON c.case_id = r.case_id
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
      WHERE t.hospital_id = $1
        AND t.status IN ('NEGOTIATING', 'TRANSPORT_DECIDED', 'TRANSPORT_DECLINED')
      ORDER BY t.updated_at DESC, t.id DESC
    `,
    [user.hospitalId],
  );

  return res.rows;
}

async function getConsultTemplate(): Promise<string> {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "HOSPITAL" || !user.hospitalId) return "";
  const settings = await getHospitalOperationsSettings(user.hospitalId);
  return settings.consultTemplate;
}

export default async function HospitalConsultsPage() {
  const [operator, rows, consultTemplate] = await Promise.all([getHospitalOperator(), getRows(), getConsultTemplate()]);

  return (
    <HospitalPortalShell hospitalName={operator.name} hospitalCode={operator.code}>
      <AutoRefreshOnInterval intervalMs={10000} />
      <div className="w-full min-w-0">
        <header className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">CONSULTS</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">相談事案一覧</h1>
          <p className="mt-1 text-sm text-slate-500">要相談・履歴事案の一覧です。</p>
        </header>
        <HospitalConsultCasesTable rows={rows} consultTemplate={consultTemplate} />
      </div>
    </HospitalPortalShell>
  );
}
