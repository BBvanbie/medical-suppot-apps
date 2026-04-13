import { AdminCasesPage } from "@/components/admin/AdminCasesPage";
import { requireAdminUser } from "@/lib/admin/adminPageAccess";

export default async function AdminCasesManagementPage() {
  await requireAdminUser();
  return <AdminCasesPage />;
}
