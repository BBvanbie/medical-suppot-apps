import { redirect } from "next/navigation";

import { EmsPortalShell } from "@/components/ems/EmsPortalShell";
import { getEmsOperator } from "@/lib/emsOperator";
import { getAuthenticatedUser } from "@/lib/authContext";

export default async function EmsSettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "EMS") redirect("/login");

  const operator = await getEmsOperator();

  return <EmsPortalShell operatorName={operator.name} operatorCode={operator.code}>{children}</EmsPortalShell>;
}
