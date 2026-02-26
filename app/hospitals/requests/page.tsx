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
  return listHospitalRequestsForHospital(user.hospitalId);
}

export default async function HospitalRequestsPage() {
  const [operator, rows] = await Promise.all([getHospitalOperator(), getRows()]);

  return (
    <HospitalPortalShell hospitalName={operator.name} hospitalCode={operator.code}>
      <div className="mx-auto w-full max-w-[1320px]">
        <header className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">REQUESTS</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">受入依頼一覧</h1>
          <p className="mt-1 text-sm text-slate-500">救急隊から送信された自院宛の受入依頼を表示します。</p>
        </header>
        <HospitalRequestsTable rows={rows} />
      </div>
    </HospitalPortalShell>
  );
}
