import { HospitalPortalShell } from "@/components/hospitals/HospitalPortalShell";
import { HospitalRequestsTable } from "@/components/hospitals/HospitalRequestsTable";
import { getAuthenticatedUser } from "@/lib/authContext";
import { getHospitalOperator } from "@/lib/hospitalOperator";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";
import { listHospitalRequestsForHospital, type HospitalRequestListItem } from "@/lib/hospitalRequestRepository";

async function getRows(): Promise<HospitalRequestListItem[]> {
  await ensureHospitalRequestTables();
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "HOSPITAL" || !user.hospitalId) return [];
  const all = await listHospitalRequestsForHospital(user.hospitalId);
  return all.filter((row) => row.status === "NEGOTIATING");
}

export default async function HospitalConsultsPage() {
  const [operator, rows] = await Promise.all([getHospitalOperator(), getRows()]);

  return (
    <HospitalPortalShell hospitalName={operator.name} hospitalCode={operator.code}>
      <div className="w-full min-w-0">
        <header className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">CONSULTS</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">相談事案一覧</h1>
          <p className="mt-1 text-sm text-slate-500">要相談の患者のみ表示します。相談ボタンからチャットを開き、相談内容や受入関連を送信できます。</p>
        </header>
        <HospitalRequestsTable rows={rows} />
      </div>
    </HospitalPortalShell>
  );
}
