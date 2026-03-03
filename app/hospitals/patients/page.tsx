import { HospitalPatientsTable } from "@/components/hospitals/HospitalPatientsTable";
import { HospitalPortalShell } from "@/components/hospitals/HospitalPortalShell";
import { getAuthenticatedUser } from "@/lib/authContext";
import { db } from "@/lib/db";
import { getHospitalOperator } from "@/lib/hospitalOperator";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";

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

async function getPageData(): Promise<{ rows: PatientTableRow[]; departments: Department[] }> {
  await ensureHospitalRequestTables();
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "HOSPITAL" || !user.hospitalId) return { rows: [], departments: [] };

  const [patientRes, departmentRes] = await Promise.all([
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
        LEFT JOIN cases c ON c.case_id = r.case_id
        LEFT JOIN emergency_teams et ON et.id = r.from_team_id
        WHERE p.hospital_id = $1
          AND t.status <> 'NOT_ACCEPTABLE'
        ORDER BY p.updated_at DESC, p.id DESC
      `,
      [user.hospitalId],
    ),
    db.query<DepartmentRow>("SELECT id, name, short_name FROM medical_departments ORDER BY id ASC"),
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

  return { rows, departments };
}

export default async function HospitalPatientsPage() {
  const [operator, data] = await Promise.all([getHospitalOperator(), getPageData()]);

  return (
    <HospitalPortalShell hospitalName={operator.name} hospitalCode={operator.code}>
      <div className="w-full min-w-0">
        <header className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">PATIENTS</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">搬送患者一覧</h1>
          <p className="mt-1 text-sm text-slate-500">搬送決定された患者のみ表示します。</p>
        </header>
        <HospitalPatientsTable rows={data.rows} departments={data.departments} />
      </div>
    </HospitalPortalShell>
  );
}
