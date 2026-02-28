import { HospitalPortalShell } from "@/components/hospitals/HospitalPortalShell";
import { getAuthenticatedUser } from "@/lib/authContext";
import { db } from "@/lib/db";
import { getHospitalOperator } from "@/lib/hospitalOperator";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";

type PatientRow = {
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

        <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
          <table className="min-w-[980px] table-fixed text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-4 py-3">更新日時</th>
                <th className="px-4 py-3">救急隊</th>
                <th className="px-4 py-3">名前</th>
                <th className="px-4 py-3">現場</th>
                <th className="px-4 py-3">距離</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-sm text-slate-500" colSpan={5}>
                    搬送患者はまだありません。
                  </td>
                </tr>
              ) : null}
              {rows.map((row, index) => (
                <tr key={`${row.updated_at}-${index}`} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-700">
                    {Number.isNaN(new Date(row.updated_at).getTime())
                      ? row.updated_at
                      : new Date(row.updated_at).toLocaleString("ja-JP")}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.team_name ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{row.patient_name ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{row.scene_address ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {typeof row.distance_km === "number" && Number.isFinite(row.distance_km)
                      ? `${row.distance_km.toFixed(1)} km`
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </HospitalPortalShell>
  );
}
