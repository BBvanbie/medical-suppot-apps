export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { AnalyticsFilterBar, AnalyticsRangeTabs, AnalyticsSection, DistributionBars, TrendBars } from "@/components/analytics/AnalyticsSections";
import { EmsMetricStrip } from "@/components/ems/EmsMetricStrip";
import { EmsPageHeader } from "@/components/ems/EmsPageHeader";
import { EmsPortalShell } from "@/components/ems/EmsPortalShell";
import { getAuthenticatedUser } from "@/lib/authContext";
import { getEmsOperator } from "@/lib/emsOperator";
import { getEmsDashboardData, parseAnalyticsRange } from "@/lib/dashboardAnalytics";

export default async function EmsStatsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const range = parseAnalyticsRange(Array.isArray(params.range) ? params.range[0] : params.range);
  const incidentType = Array.isArray(params.incidentType) ? params.incidentType[0] : params.incidentType;
  const ageBucket = Array.isArray(params.ageBucket) ? params.ageBucket[0] : params.ageBucket;
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "EMS" || !user.teamId) redirect("/");

  const [operator, data] = await Promise.all([
    getEmsOperator(),
    getEmsDashboardData(user.teamId, range, { incidentType, ageBucket }),
  ]);

  return (
    <EmsPortalShell operatorName={operator.name} operatorCode={operator.code}>
      <div className="page-frame page-frame--wide page-stack page-stack--lg w-full min-w-0">
        <EmsPageHeader
          eyebrow="EMS STATISTICS"
          title="救急隊統計"
          description="最近の自隊傾向を、時間、種別、年齢帯で比較しながら、搬送決定までの流れを読み取るための統計画面です。"
          chip={data.rangeLabel}
          actions={[
            { label: "ホーム", href: "/paramedics", variant: "secondary" },
            { label: "病院検索", href: "/hospitals/search", variant: "primary" },
          ]}
        />
        <AnalyticsRangeTabs basePath="/paramedics/stats" activeRange={range} />
        <AnalyticsFilterBar
          action="/paramedics/stats"
          range={range}
          filters={[
            { name: "incidentType", label: "事案種別", value: data.activeFilters.incidentType, options: data.filterOptions.incidentTypes },
            { name: "ageBucket", label: "年齢帯", value: data.activeFilters.ageBucket, options: data.filterOptions.ageBuckets },
          ]}
        />
        <EmsMetricStrip title="RANGE SUMMARY" items={data.kpis.map((item) => ({ label: item.label, value: item.value, hint: item.hint }))} />
        <div className="grid gap-4 xl:grid-cols-2">
          <AnalyticsSection title="種別ごと出場件数" description="最近よく発生している事案種別の件数です。">
            <DistributionBars items={data.incidentCounts} />
          </AnalyticsSection>
          <AnalyticsSection title="種別ごとの搬送 / 不搬送" description="青が搬送、灰色が不搬送です。">
            <DistributionBars items={data.transportByIncident} secondaryLabel="不搬送" />
          </AnalyticsSection>
          <AnalyticsSection title="送信〜HP決定 推移" description="日別の平均決定時間です。">
            <TrendBars items={data.decisionTrend} />
          </AnalyticsSection>
          <AnalyticsSection title="年齢別要請件数" description="患者年齢をざっくり区分して表示しています。">
            <DistributionBars items={data.ageGroups} />
          </AnalyticsSection>
          <AnalyticsSection title="時間帯別の平均決定時間" description="送信時刻ベースで集計しています。">
            <TrendBars items={data.hourlyDecision} />
          </AnalyticsSection>
          <AnalyticsSection title="曜日別の平均決定時間" description="曜日ごとの差を確認できます。">
            <TrendBars items={data.weekdayDecision} />
          </AnalyticsSection>
        </div>
      </div>
    </EmsPortalShell>
  );
}
