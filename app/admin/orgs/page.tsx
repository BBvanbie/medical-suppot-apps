import { AdminOrgsPage } from "@/components/admin/AdminOrgsPage";
import { requireAdminUser } from "@/lib/admin/adminPageAccess";
import { listAdminOrgs } from "@/lib/admin/adminManagementRepository";
import { ensureAdminManagementSchema } from "@/lib/admin/adminManagementSchema";

export default async function AdminOrgsManagementPage() {
  await requireAdminUser();
  await ensureAdminManagementSchema();
  const initialRows = await listAdminOrgs();
  return <AdminOrgsPage initialRows={initialRows} />;
}
