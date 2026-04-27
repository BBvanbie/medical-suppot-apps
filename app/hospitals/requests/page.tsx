import { HospitalListSummaryStrip } from "@/components/hospitals/HospitalListSummaryStrip";
import { HospitalMciRequestsPanel } from "@/components/hospitals/HospitalMciRequestsPanel";
import { HospitalPortalShell } from "@/components/hospitals/HospitalPortalShell";
import { HospitalRequestsTable } from "@/components/hospitals/HospitalRequestsTable";
import { ManualRefreshButton } from "@/components/shared/ManualRefreshButton";
import { getAuthenticatedUser } from "@/lib/authContext";
import { getHospitalDepartmentPrioritySummary, getHospitalNextActionLabel } from "@/lib/hospitalPriority";
import { getHospitalOperator } from "@/lib/hospitalOperator";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";
import { listHospitalRequestsForHospital, type HospitalRequestListItem } from "@/lib/hospitalRequestRepository";
import { getHospitalOperationsSettings } from "@/lib/hospitalSettingsRepository";
import { isSchemaRequirementsError } from "@/lib/schemaRequirements";

async function getRows(): Promise<HospitalRequestListItem[]> {
  try {
    await ensureHospitalRequestTables();
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "HOSPITAL" || !user.hospitalId) return [];
    return listHospitalRequestsForHospital(user.hospitalId, user.currentMode);
  } catch (error) {
    if (isSchemaRequirementsError(error, "ensureHospitalRequestTables")) {
      console.warn("[hospital-requests] schema requirements missing; returning empty list.");
      return [];
    }
    throw error;
  }
}

async function getConsultTemplate(): Promise<string> {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "HOSPITAL" || !user.hospitalId) return "";
  const settings = await getHospitalOperationsSettings(user.hospitalId);
  return settings.consultTemplate;
}

export default async function HospitalRequestsPage() {
  const [user, operator, rows, consultTemplate] = await Promise.all([
    getAuthenticatedUser(),
    getHospitalOperator(),
    getRows(),
    getConsultTemplate(),
  ]);

  const priorityCount = rows.filter((row) => getHospitalDepartmentPrioritySummary(row.selectedDepartments)).length;
  const replyPendingCount = rows.filter((row) => row.status === "READ" || row.status === "UNREAD").length;
  const consultingCount = rows.filter((row) => row.status === "NEGOTIATING").length;
  const leadAction = rows[0] ? getHospitalNextActionLabel(rows[0].status) : "新規受信待ち";

  return (
    <HospitalPortalShell hospitalName={operator.name} hospitalCode={operator.code} currentMode={user?.currentMode ?? "LIVE"}>
      <div className="w-full min-w-0">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="portal-eyebrow portal-eyebrow--hospital">REQUESTS</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">選定依頼一覧</h1>
            <p className="mt-1 text-sm text-slate-500">救急隊・本部から届いた病院選定依頼を一覧で表示します。</p>
          </div>
          <ManualRefreshButton />
        </header>
        <HospitalListSummaryStrip
          items={[
            { label: "TOTAL REQUESTS", value: rows.length, hint: "現在の表示件数" },
            { label: "PRIORITY DEPTS", value: priorityCount, hint: "救命 / CCU / 脳卒中を含む案件", tone: "priority" },
            { label: "REPLY PENDING", value: replyPendingCount, hint: "未読または未返信", tone: "warning" },
            { label: "CONSULTING", value: consultingCount, hint: leadAction, tone: "action" },
          ]}
        />
        <HospitalMciRequestsPanel />
        <HospitalRequestsTable rows={rows} consultTemplate={consultTemplate} />
      </div>
    </HospitalPortalShell>
  );
}
