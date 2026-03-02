import { HospitalPatientsTable } from "@/components/hospitals/HospitalPatientsTable";
import { HospitalPortalShell } from "@/components/hospitals/HospitalPortalShell";
import { getAuthenticatedUser } from "@/lib/authContext";
import { db } from "@/lib/db";
import { getHospitalOperator } from "@/lib/hospitalOperator";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";

type PatientRow = {
  target_id: number;
  updated_at: string;
  team_name: string | null;
  patient_name: string | null;
  scene_address: string | null;
  distance_km: number | null;
};

async function getRows() {
  await ensureHospitalRequestTables();
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "HOSPITAL" || !user.hospitalId) return [];

  const res = await db.query<PatientRow>(
    `
      SELECT
        p.target_id,
        p.updated_at::text AS updated_at,
        et.team_name,
        NULLIF(btrim(COALESCE(r.patient_summary->>'name', '')), '') AS patient_name,
        NULLIF(btrim(COALESCE(r.patient_summary->>'address', '')), '') AS scene_address,
        t.distance_km
      FROM hospital_patients p
      JOIN hospital_request_targets t ON t.id = p.target_id
      JOIN hospital_requests r ON r.id = t.hospital_request_id
      LEFT JOIN emergency_teams et ON et.id = r.from_team_id
      WHERE p.hospital_id = $1
      ORDER BY p.updated_at DESC, p.id DESC
    `,
    [user.hospitalId],
  );
  return res.rows;
}

export default async function HospitalPatientsPage() {
  const [operator, rows] = await Promise.all([getHospitalOperator(), getRows()]);

  return (
    <HospitalPortalShell hospitalName={operator.name} hospitalCode={operator.code}>
      <div className="mx-auto w-full max-w-[1320px]">
        <header className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">PATIENTS</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">搬送患者一覧</h1>
          <p className="mt-1 text-sm text-slate-500">搬送決定された患者のみ表示します。</p>
        </header>
        <HospitalPatientsTable rows={rows} />
      </div>
    </HospitalPortalShell>
  );
}
