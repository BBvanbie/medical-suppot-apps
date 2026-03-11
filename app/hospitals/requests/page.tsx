import { AutoRefreshOnInterval } from "@/components/shared/AutoRefreshOnInterval";
import { HospitalPortalShell } from "@/components/hospitals/HospitalPortalShell";
import { HospitalRequestsTable } from "@/components/hospitals/HospitalRequestsTable";
import { getAuthenticatedUser } from "@/lib/authContext";
import { getHospitalOperator } from "@/lib/hospitalOperator";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";
import { listHospitalRequestsForHospital, type HospitalRequestListItem } from "@/lib/hospitalRequestRepository";
import { getHospitalOperationsSettings } from "@/lib/hospitalSettingsRepository";

async function getRows(): Promise<HospitalRequestListItem[]> {
  await ensureHospitalRequestTables();
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "HOSPITAL" || !user.hospitalId) return [];
  return listHospitalRequestsForHospital(user.hospitalId);
}

async function getConsultTemplate(): Promise<string> {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "HOSPITAL" || !user.hospitalId) return "";
  const settings = await getHospitalOperationsSettings(user.hospitalId);
  return settings.consultTemplate;
}

export default async function HospitalRequestsPage() {
  const [operator, rows, consultTemplate] = await Promise.all([getHospitalOperator(), getRows(), getConsultTemplate()]);

  return (
    <HospitalPortalShell hospitalName={operator.name} hospitalCode={operator.code}>
      <AutoRefreshOnInterval intervalMs={10000} />
      <div className="w-full min-w-0">
        <header className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">REQUESTS</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">受入要請一覧</h1>
          <p className="mt-1 text-sm text-slate-500">救急隊から送信された受入要請の一覧です。</p>
        </header>
        <HospitalRequestsTable rows={rows} consultTemplate={consultTemplate} />
      </div>
    </HospitalPortalShell>
  );
}
