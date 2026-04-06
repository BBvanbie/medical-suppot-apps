export const dynamic = "force-dynamic";

import { AdminPortalShell } from "@/components/admin/AdminPortalShell";
import { getAuthenticatedUser } from "@/lib/authContext";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getAuthenticatedUser();
  const adminName = user?.username || "管理者";
  const adminCode = user?.username || "ADMIN";

  return <AdminPortalShell adminName={adminName} adminCode={adminCode} currentMode={user?.currentMode ?? "LIVE"}>{children}</AdminPortalShell>;
}
