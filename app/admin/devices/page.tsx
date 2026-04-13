import { AdminDevicesPage } from "@/components/admin/AdminDevicesPage";
import { requireAdminUser } from "@/lib/admin/adminPageAccess";
import {
  ensureDefaultAdminDevicesSeeded,
  listAdminDeviceHospitalOptions,
  listAdminDevices,
  listAdminDeviceTeamOptions,
} from "@/lib/admin/adminDevicesRepository";
import { ensureAdminManagementSchema } from "@/lib/admin/adminManagementSchema";

export default async function AdminDevicesManagementPage() {
  await requireAdminUser();
  await ensureAdminManagementSchema();
  await ensureDefaultAdminDevicesSeeded();
  const [rows, teamOptions, hospitalOptions] = await Promise.all([
    listAdminDevices(),
    listAdminDeviceTeamOptions(),
    listAdminDeviceHospitalOptions(),
  ]);

  return <AdminDevicesPage initialRows={rows} teamOptions={teamOptions} hospitalOptions={hospitalOptions} />;
}
