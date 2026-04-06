export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { DispatchPortalShell } from "@/components/dispatch/DispatchPortalShell";
import { isAppRole } from "@/lib/auth";
import { getAuthenticatedUser } from "@/lib/authContext";

export default async function DispatchLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const currentUser = await getAuthenticatedUser();
  const user = session?.user as
    | {
        role?: string;
        username?: string;
        displayName?: string;
      }
    | undefined;

  if (
    !user?.role
    || !isAppRole(user.role)
    || (user.role !== "DISPATCH" && user.role !== "ADMIN")
    || !currentUser
    || (currentUser.role !== "DISPATCH" && currentUser.role !== "ADMIN")
  ) {
    redirect("/login");
  }

  const operatorName = user.displayName || user.username || (user.role === "ADMIN" ? "管理者" : "指令");
  const operatorCode = user.username || user.role;

  return (
    <DispatchPortalShell operatorName={operatorName} operatorCode={operatorCode} currentMode={currentUser.currentMode}>
      {children}
    </DispatchPortalShell>
  );
}
