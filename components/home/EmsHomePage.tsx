import { redirect } from "next/navigation";

import { HomeDashboard } from "@/components/home/HomeDashboard";
import { getAuthenticatedUser } from "@/lib/authContext";
import { getEmsOperator } from "@/lib/emsOperator";
import { getEmsOperationalMode } from "@/lib/emsSettingsRepository";
import { getEmsDashboardData } from "@/lib/dashboardAnalytics";

export async function EmsHomePage() {
  const [operator, user] = await Promise.all([getEmsOperator(), getAuthenticatedUser()]);
  if (!user || user.role !== "EMS" || !user.teamId) {
    redirect("/");
  }

  const [data, operationalMode] = await Promise.all([
    user.currentMode === "TRAINING" ? Promise.resolve(null) : getEmsDashboardData(user.teamId, "30d"),
    getEmsOperationalMode(user.id),
  ]);

  return (
    <HomeDashboard
      operatorName={operator.name}
      operatorCode={operator.code}
      currentMode={user.currentMode}
      operationalMode={operationalMode}
      data={data}
    />
  );
}
