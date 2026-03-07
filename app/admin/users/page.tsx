import { AdminUsersPage } from "@/components/admin/AdminUsersPage";
import { listAdminHospitalOptions, listAdminTeamOptions, listAdminUsers } from "@/lib/admin/adminManagementRepository";
import { ensureAdminManagementSchema } from "@/lib/admin/adminManagementSchema";

export default async function AdminUsersManagementPage() {
  await ensureAdminManagementSchema();
  const [rows, teamOptions, hospitalOptions] = await Promise.all([
    listAdminUsers(),
    listAdminTeamOptions(),
    listAdminHospitalOptions(),
  ]);

  return <AdminUsersPage initialRows={rows} teamOptions={teamOptions} hospitalOptions={hospitalOptions} />;
}
