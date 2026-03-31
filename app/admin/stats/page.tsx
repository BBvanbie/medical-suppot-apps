export const dynamic = "force-dynamic";

import { AnalyticsFilterBar, AnalyticsHeader, AnalyticsRangeTabs, AnalyticsSection, AlertList, DashboardKpiGrid, DistributionBars } from "@/components/analytics/AnalyticsSections";
import { getAdminDashboardData, parseAnalyticsRange } from "@/lib/dashboardAnalytics";

export default async function AdminStatsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const range = parseAnalyticsRange(Array.isArray(params.range) ? params.range[0] : params.range);
  const incidentType = Array.isArray(params.incidentType) ? params.incidentType[0] : params.incidentType;
  const ageBucket = Array.isArray(params.ageBucket) ? params.ageBucket[0] : params.ageBucket;
  const data = await getAdminDashboardData(range, { incidentType, ageBucket });

  return (
    <div className="page-frame page-frame--wide page-stack page-stack--lg w-full min-w-0">
      <AnalyticsHeader eyebrow="ADMIN STATISTICS" title="全体統計" description="全体件数、滞留、応答遅延、地域や隊の偏りを俯瞰します。" rangeLabel={data.rangeLabel} />
      <AnalyticsRangeTabs basePath="/admin/stats" activeRange={range} />
      <AnalyticsFilterBar
        action="/admin/stats"
        range={range}
        filters={[
          { name: "incidentType", label: "事案種別", value: data.activeFilters.incidentType, options: data.filterOptions.incidentTypes },
          { name: "ageBucket", label: "年齢帯", value: data.activeFilters.ageBucket, options: data.filterOptions.ageBuckets },
        ]}
      />
      <DashboardKpiGrid items={data.kpis} />
      <div className="grid gap-4 xl:grid-cols-2">
        <AnalyticsSection title="システム全体アラート" description="応答遅延や難渋傾向がある項目を表示します。">
          <AlertList items={data.alerts} />
        </AnalyticsSection>
        <AnalyticsSection title="種別別全体件数" description="全体で多い事案種別です。">
          <DistributionBars items={data.incidentCounts} />
        </AnalyticsSection>
        <AnalyticsSection title="種別別 搬送 / 不搬送" description="青が搬送、灰色が不搬送です。">
          <DistributionBars items={data.transportByIncident} secondaryLabel="不搬送" />
        </AnalyticsSection>
        <AnalyticsSection title="出場件数上位10隊" description="件数ベースの簡易ランキングです。">
          <DistributionBars items={data.topTeams} />
        </AnalyticsSection>
        <AnalyticsSection title="地域別平均決定時間" description="指令先住所から市区町村相当を抽出しています。" >
          <DistributionBars items={data.regionalDecision} valueSuffix="分" />
        </AnalyticsSection>
        <AnalyticsSection title="年齢別要請件数" description="年齢帯ごとの件数です。">
          <DistributionBars items={data.ageGroups} />
        </AnalyticsSection>
        <AnalyticsSection title="病院別応答遅延" description="平均返信時間が長い順に表示しています。">
          <DistributionBars items={data.hospitalDelay} valueSuffix="分" />
        </AnalyticsSection>
      </div>
    </div>
  );
}
