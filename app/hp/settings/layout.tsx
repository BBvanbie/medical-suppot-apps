import { redirect } from "next/navigation";

import { HospitalPortalShell } from "@/components/hospitals/HospitalPortalShell";
import { getAuthenticatedUser } from "@/lib/authContext";
import { getHospitalOperator } from "@/lib/hospitalOperator";

export default async function HospitalSettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "HOSPITAL") redirect("/login");

  const operator = await getHospitalOperator();

  return <HospitalPortalShell hospitalName={operator.name} hospitalCode={operator.code}>{children}</HospitalPortalShell>;
}
