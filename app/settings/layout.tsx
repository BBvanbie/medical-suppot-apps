import { redirect } from "next/navigation";

import { EmsPortalShell } from "@/components/ems/EmsPortalShell";
import { getEmsOperator } from "@/lib/emsOperator";
import { getAuthenticatedUser } from "@/lib/authContext";
import { getEmsOperationalMode } from "@/lib/emsSettingsRepository";

export default async function EmsSettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "EMS") redirect("/login");

  const [operator, operationalMode] = await Promise.all([getEmsOperator(), getEmsOperationalMode(user.id)]);

  return <EmsPortalShell operatorName={operator.name} operatorCode={operator.code} currentMode={user.currentMode} operationalMode={operationalMode}>{children}</EmsPortalShell>;
}
