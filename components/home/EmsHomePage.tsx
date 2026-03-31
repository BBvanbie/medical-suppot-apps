import { redirect } from "next/navigation";

import { HomeDashboard } from "@/components/home/HomeDashboard";
import { getAuthenticatedUser } from "@/lib/authContext";
import { getEmsOperator } from "@/lib/emsOperator";
import { getEmsDashboardData } from "@/lib/dashboardAnalytics";

export async function EmsHomePage() {
  const [operator, user] = await Promise.all([getEmsOperator(), getAuthenticatedUser()]);
  if (!user || user.role !== "EMS" || !user.teamId) {
    redirect("/");
  }

  const data = await getEmsDashboardData(user.teamId, "30d");
  return <HomeDashboard operatorName={operator.name} operatorCode={operator.code} data={data} />;
}
