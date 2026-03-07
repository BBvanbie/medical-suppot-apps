import { AdminLogsPage } from "@/components/admin/AdminLogsPage";
import { listGlobalAdminAuditLogs } from "@/lib/admin/adminManagementRepository";
import { ensureAdminManagementSchema } from "@/lib/admin/adminManagementSchema";

export default async function AdminLogsManagementPage() {
  await ensureAdminManagementSchema();
  const initialLogs = await listGlobalAdminAuditLogs();
  return <AdminLogsPage initialLogs={initialLogs} />;
}
