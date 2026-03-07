import { AdminOrgsPage } from "@/components/admin/AdminOrgsPage";
import { listAdminOrgs } from "@/lib/admin/adminManagementRepository";
import { ensureAdminManagementSchema } from "@/lib/admin/adminManagementSchema";

export default async function AdminOrgsManagementPage() {
  await ensureAdminManagementSchema();
  const initialRows = await listAdminOrgs();
  return <AdminOrgsPage initialRows={initialRows} />;
}
