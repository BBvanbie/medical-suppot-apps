import { HospitalListSummaryStrip } from "@/components/hospitals/HospitalListSummaryStrip";
import { HospitalPatientsTable } from "@/components/hospitals/HospitalPatientsTable";
import { HospitalPortalShell } from "@/components/hospitals/HospitalPortalShell";
import { ManualRefreshButton } from "@/components/shared/ManualRefreshButton";
import { getAuthenticatedUser } from "@/lib/authContext";
import { db } from "@/lib/db";
import { getHospitalDepartmentPrioritySummary, getHospitalNextActionLabel } from "@/lib/hospitalPriority";
import { getHospitalOperator } from "@/lib/hospitalOperator";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";
import { getHospitalOperationsSettings } from "@/lib/hospitalSettingsRepository";

type PatientRow = {
  target_id: number;
  request_id: string;
  case_id: string;
  status: string;
  decided_at: string;
  aware_date: string | null;
  aware_time: string | null;
  team_name: string | null;
  patient_name: string | null;
  patient_age: string | null;
  patient_gender: string | null;
  dispatch_address: string | null;
  selected_departments: string[] | null;
};

type DepartmentRow = {
  id: number;
  name: string;
  short_name: string;
};

type Department = {
  id: number;
  name: string;
  shortName: string;
};

type PatientTableRow = {
  target_id: number;
  request_id: string;
  case_id: string;
  status: string;
  decided_at: string;
  aware_date: string | null;
  aware_time: string | null;
  team_name: string | null;
  patient_name: string | null;
  patient_age: string | null;
  patient_gender: string | null;
  dispatch_address: string | null;
  selected_departments: string[];
  selected_department_short_names: string[];
};

async function getPageData(): Promise<{ rows: PatientTableRow[]; departments: Department[]; consultTemplate: string }> {
  await ensureHospitalRequestTables();
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "HOSPITAL" || !user.hospitalId) {
    return { rows: [], departments: [], consultTemplate: "" };
  }

  const [patientRes, departmentRes, settings] = await Promise.all([
    db.query<PatientRow>(
      `
        SELECT
          p.target_id,
          p.request_id,
          p.case_id,
          t.status,
          p.updated_at::text AS decided_at,
          c.aware_date::text AS aware_date,
          c.aware_time::text AS aware_time,
          et.team_name,
          NULLIF(btrim(COALESCE(r.patient_summary->>'name', '')), '') AS patient_name,
          NULLIF(btrim(COALESCE(r.patient_summary->>'age', '')), '') AS patient_age,
          NULLIF(btrim(COALESCE(r.patient_summary->>'gender', '')), '') AS patient_gender,
          c.address AS dispatch_address,
          COALESCE(t.selected_departments, '[]'::jsonb)::jsonb AS selected_departments
        FROM hospital_patients p
        JOIN hospital_request_targets t ON t.id = p.target_id
        JOIN hospital_requests r ON r.id = t.hospital_request_id
        LEFT JOIN cases c ON c.case_uid = r.case_uid
        LEFT JOIN emergency_teams et ON et.id = r.from_team_id
        WHERE p.hospital_id = $1
          AND p.mode = $2
          AND t.status <> 'NOT_ACCEPTABLE'
        ORDER BY p.updated_at DESC, p.id DESC
      `,
      [user.hospitalId, user.currentMode],
    ),
    db.query<DepartmentRow>("SELECT id, name, short_name FROM medical_departments ORDER BY id ASC"),
    getHospitalOperationsSettings(user.hospitalId),
  ]);

  const departments: Department[] = departmentRes.rows.map((d) => ({
    id: d.id,
    name: d.name,
    shortName: d.short_name,
  }));
  const departmentNameByKey = new Map<string, string>();
  for (const dept of departments) {
    departmentNameByKey.set(dept.shortName, dept.name);
    departmentNameByKey.set(dept.name, dept.name);
  }

  const rows: PatientTableRow[] = patientRes.rows.map((row) => {
    const selectedShortNames = (row.selected_departments ?? []).filter(
      (v): v is string => typeof v === "string" && v.trim().length > 0,
    );
    return {
      target_id: row.target_id,
      request_id: row.request_id,
      case_id: row.case_id,
      status: row.status,
      decided_at: row.decided_at,
      aware_date: row.aware_date,
      aware_time: row.aware_time,
      team_name: row.team_name,
      patient_name: row.patient_name,
      patient_age: row.patient_age,
      patient_gender: row.patient_gender,
      dispatch_address: row.dispatch_address,
      selected_departments: selectedShortNames.map((v) => departmentNameByKey.get(v) ?? v),
      selected_department_short_names: selectedShortNames,
    };
  });

  return { rows, departments, consultTemplate: settings.consultTemplate };
}

export default async function HospitalPatientsPage() {
  const [user, operator, data] = await Promise.all([getAuthenticatedUser(), getHospitalOperator(), getPageData()]);
  const priorityCount = data.rows.filter((row) => getHospitalDepartmentPrioritySummary(row.selected_departments)).length;
  const consultingCount = data.rows.filter((row) => row.status === "NEGOTIATING").length;
  const transportDecidedCount = data.rows.filter((row) => row.status === "TRANSPORT_DECIDED").length;
  const leadAction = data.rows[0] ? getHospitalNextActionLabel(data.rows[0].status) : "受入患者待ち";

  return (
    <HospitalPortalShell hospitalName={operator.name} hospitalCode={operator.code} currentMode={user?.currentMode ?? "LIVE"}>
      <div className="w-full max-w-6xl min-w-0">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="portal-eyebrow portal-eyebrow--hospital">PATIENTS</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">受入患者一覧</h1>
            <p className="mt-1 text-sm text-slate-500">受入済み患者と、その後の搬送判断状況を一覧で確認します。</p>
          </div>
          <ManualRefreshButton />
        </header>
        <HospitalListSummaryStrip
          items={[
            { label: "TOTAL PATIENTS", value: data.rows.length, hint: "現在の表示件数" },
            { label: "PRIORITY DEPTS", value: priorityCount, hint: "救命 / CCU / 脳卒中を含む患者", tone: "priority" },
            { label: "CONSULTING", value: consultingCount, hint: "相談継続中の患者", tone: "warning" },
            { label: "TRANSPORT DECIDED", value: transportDecidedCount, hint: leadAction, tone: "action" },
          ]}
        />
        <HospitalPatientsTable rows={data.rows} departments={data.departments} consultTemplate={data.consultTemplate} />
      </div>
    </HospitalPortalShell>
  );
}
