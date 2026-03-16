import { HospitalPortalShell } from "@/components/hospitals/HospitalPortalShell";
import { ManualRefreshButton } from "@/components/shared/ManualRefreshButton";
import { getAuthenticatedUser } from "@/lib/authContext";
import { db } from "@/lib/db";
import { formatAwareDateYmd, formatDateTimeMdHm } from "@/lib/dateTimeFormat";
import { getHospitalOperator } from "@/lib/hospitalOperator";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";

type Row = {
  case_id: string;
  team_name: string | null;
  aware_date: string | null;
  patient_name: string | null;
  patient_age: string | null;
  patient_gender: string | null;
  selected_departments: string[] | null;
  status: string;
  declined_at: string;
};

async function getRows(): Promise<Row[]> {
  await ensureHospitalRequestTables();
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "HOSPITAL" || !user.hospitalId) return [];

  const res = await db.query<Row>(
    `
      SELECT
        r.case_id,
        et.team_name,
        c.aware_date::text AS aware_date,
        NULLIF(btrim(COALESCE(r.patient_summary->>'name', '')), '') AS patient_name,
        NULLIF(btrim(COALESCE(r.patient_summary->>'age', '')), '') AS patient_age,
        NULLIF(btrim(COALESCE(r.patient_summary->>'gender', '')), '') AS patient_gender,
        COALESCE(t.selected_departments, '[]'::jsonb)::jsonb AS selected_departments,
        t.status,
        t.updated_at::text AS declined_at
      FROM hospital_request_targets t
      JOIN hospital_requests r ON r.id = t.hospital_request_id
      LEFT JOIN emergency_teams et ON et.id = r.from_team_id
      LEFT JOIN cases c ON c.case_id = r.case_id
      WHERE t.hospital_id = $1
        AND t.status IN ('NOT_ACCEPTABLE', 'TRANSPORT_DECLINED')
      ORDER BY t.updated_at DESC, t.id DESC
    `,
    [user.hospitalId],
  );

  return res.rows;
}

export default async function HospitalDeclinedPage() {
  const [operator, rows] = await Promise.all([getHospitalOperator(), getRows()]);

  return (
    <HospitalPortalShell hospitalName={operator.name} hospitalCode={operator.code}>
      <div className="w-full min-w-0">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="portal-eyebrow portal-eyebrow--hospital">DECLINED</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">搬送辞退患者一覧</h1>
          </div>
          <ManualRefreshButton />
        </header>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
          <table className="min-w-[1160px] w-full table-fixed text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-4 py-3">事案ID</th>
                <th className="px-4 py-3">A隊名</th>
                <th className="px-4 py-3">覚知日時</th>
                <th className="px-4 py-3">氏名</th>
                <th className="px-4 py-3">年齢</th>
                <th className="px-4 py-3">性別</th>
                <th className="px-4 py-3">選定科目</th>
                <th className="px-4 py-3">病院側回答</th>
                <th className="px-4 py-3">搬送辞退受信日時</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.case_id}-${row.declined_at}`} className="border-t border-slate-100 text-slate-700">
                  <td className="px-4 py-3 font-semibold">{row.case_id}</td>
                  <td className="px-4 py-3">{row.team_name ?? "-"}</td>
                  <td className="px-4 py-3">{formatAwareDateYmd(row.aware_date ?? "") || "-"}</td>
                  <td className="px-4 py-3">{row.patient_name ?? "-"}</td>
                  <td className="px-4 py-3">{row.patient_age ?? "-"}</td>
                  <td className="px-4 py-3">{row.patient_gender ?? "-"}</td>
                  <td className="px-4 py-3">{row.selected_departments?.join(", ") || "-"}</td>
                  <td className="px-4 py-3">{row.status}</td>
                  <td className="px-4 py-3">{formatDateTimeMdHm(row.declined_at)}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-sm text-slate-500">
                    該当患者はありません。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </HospitalPortalShell>
  );
}
