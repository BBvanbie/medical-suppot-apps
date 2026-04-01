export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { AnalyticsFilterBar, AnalyticsHeader, AnalyticsRangeTabs, AnalyticsSection, DashboardKpiGrid, DistributionBars, PendingList, TrendBars } from "@/components/analytics/AnalyticsSections";
import { HospitalPortalShell } from "@/components/hospitals/HospitalPortalShell";
import { getAuthenticatedUser } from "@/lib/authContext";
import { getHospitalDashboardData, parseAnalyticsRange } from "@/lib/dashboardAnalytics";
import { getHospitalOperator } from "@/lib/hospitalOperator";

export default async function HospitalStatsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const range = parseAnalyticsRange(Array.isArray(params.range) ? params.range[0] : params.range);
  const department = Array.isArray(params.department) ? params.department[0] : params.department;
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "HOSPITAL" || !user.hospitalId) redirect("/");

  const [operator, data] = await Promise.all([
    getHospitalOperator(),
    getHospitalDashboardData(user.hospitalId, range, { department }),
  ]);

  return (
    <HospitalPortalShell hospitalName={operator.name} hospitalCode={operator.code}>
      <div className="page-frame page-frame--wide page-stack page-stack--lg w-full min-w-0">
        <AnalyticsHeader eyebrow="HOSPITAL STATISTICS" title="病院統計" description="backlog、応答速度、相談後受入の傾向を確認します。" rangeLabel={data.rangeLabel} />
        <AnalyticsRangeTabs basePath="/hospitals/stats" activeRange={range} />
        <AnalyticsFilterBar
          action="/hospitals/stats"
          range={range}
          filters={[
            { name: "department", label: "科目", value: data.activeFilters.department, options: data.filterOptions.departments },
          ]}
        />
        <DashboardKpiGrid items={[...data.backlogKpis, ...data.timingKpis]} />
        <div className="grid gap-4 xl:grid-cols-2">
          <AnalyticsSection title="科目別要請割合" description="この期間に届いた要請の科目別件数です。">
            <DistributionBars items={data.departmentRequests} />
          </AnalyticsSection>
          <AnalyticsSection title="科目別受入可能件数" description="受入可能で返答した件数です。">
            <DistributionBars items={data.departmentAcceptable} />
          </AnalyticsSection>
          <AnalyticsSection title="既読〜返信 平均推移" description="日別の平均返信時間です。">
            <TrendBars items={data.responseTrend} />
          </AnalyticsSection>
          <AnalyticsSection title="未対応案件" description="優先して確認したい案件を上位から表示します。">
            <PendingList items={data.pendingItems} />
          </AnalyticsSection>
        </div>
      </div>
    </HospitalPortalShell>
  );
}
