export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { AdminPortalShell } from "@/components/admin/AdminPortalShell";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const user = session?.user as
    | {
        username?: string;
        displayName?: string;
      }
    | undefined;

  const adminName = user?.displayName || user?.username || "管理者";
  const adminCode = user?.username || "ADMIN";

  return <AdminPortalShell adminName={adminName} adminCode={adminCode}>{children}</AdminPortalShell>;
}
