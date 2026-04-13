export const dynamic = "force-dynamic";

import { AdminPortalShell } from "@/components/admin/AdminPortalShell";
import { requireAdminUser } from "@/lib/admin/adminPageAccess";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireAdminUser();
  const adminName = user.username;
  const adminCode = user.username;

  return <AdminPortalShell adminName={adminName} adminCode={adminCode} currentMode={user.currentMode}>{children}</AdminPortalShell>;
}
