import { HospitalPortalShell } from "@/components/hospitals/HospitalPortalShell";
import { getAuthenticatedUser } from "@/lib/authContext";
import { db } from "@/lib/db";
import { getHospitalOperator } from "@/lib/hospitalOperator";

type PatientRow = {
  request_id: string;
  case_id: string;
  status: string;
  updated_at: string;
};

async function getRows() {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "HOSPITAL" || !user.hospitalId) return [];

  const res = await db.query<PatientRow>(
    `
      SELECT request_id, case_id, status, updated_at::text
      FROM hospital_patients
      WHERE hospital_id = $1
      ORDER BY updated_at DESC, id DESC
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
          <table className="min-w-[820px] table-fixed text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-4 py-3">更新時刻</th>
                <th className="px-4 py-3">依頼ID</th>
                <th className="px-4 py-3">事案ID</th>
                <th className="px-4 py-3">状態</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-sm text-slate-500" colSpan={4}>
                    搬送患者はまだありません。
                  </td>
                </tr>
              ) : null}
              {rows.map((row: PatientRow) => (
                <tr key={`${row.request_id}-${row.case_id}`} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-700">
                    {Number.isNaN(new Date(row.updated_at).getTime())
                      ? row.updated_at
                      : new Date(row.updated_at).toLocaleString("ja-JP")}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{row.request_id}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{row.case_id}</td>
                  <td className="px-4 py-3 text-slate-700">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </HospitalPortalShell>
  );
}

