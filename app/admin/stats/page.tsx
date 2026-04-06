export const dynamic = "force-dynamic";

import { AdminWorkbenchSection } from "@/components/admin/AdminWorkbench";
import {
  AlertList,
  AnalyticsFilterBar,
  AnalyticsHeader,
  AnalyticsRangeTabs,
  DashboardKpiGrid,
  DistributionBars,
} from "@/components/analytics/AnalyticsSections";
import { AnalyticsPageLayout } from "@/components/analytics/AnalyticsPageLayout";
import { SectionPanelFrame } from "@/components/shared/SectionPanelFrame";
import { getAuthenticatedUser } from "@/lib/authContext";
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
  const user = await getAuthenticatedUser();
  const data = user?.currentMode === "TRAINING" ? null : await getAdminDashboardData(range, { incidentType, ageBucket });

  return (
    <AnalyticsPageLayout
      className="page-frame page-frame--wide w-full min-w-0"
      header={
        <section className="overflow-hidden rounded-[30px] border border-orange-100/80 bg-white px-6 py-5 shadow-[0_24px_54px_-40px_rgba(15,23,42,0.28)]">
          <AnalyticsHeader
            eyebrow="ADMIN STATISTICS"
            title="全体統計"
            description={user?.currentMode === "TRAINING" ? "訓練モードでは本番統計を表示しません。training はモード切替で監視し、集計には含めません。" : "全体件数、滞留、応答遅延、地域や隊の偏りを俯瞰する admin 専用の統計 workbench です。"}
            rangeLabel={data?.rangeLabel ?? "TRAINING"}
            badgeClassName="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700"
          />
          {user?.currentMode === "TRAINING" ? null : <AnalyticsRangeTabs
            basePath="/admin/stats"
            activeRange={range}
            activeClassName="bg-orange-600 text-white ring-orange-600"
            inactiveClassName="bg-white text-slate-600 ring-slate-200 hover:border-orange-200 hover:bg-orange-50/60 hover:text-orange-700"
          />}
          {user?.currentMode === "TRAINING" ? null : <AnalyticsFilterBar
            action="/admin/stats"
            range={range}
            filters={[
              { name: "incidentType", label: "事案種別", value: data?.activeFilters.incidentType ?? "", options: data?.filterOptions.incidentTypes ?? [{ label: "すべて", value: "" }] },
              { name: "ageBucket", label: "年齢帯", value: data?.activeFilters.ageBucket ?? "", options: data?.filterOptions.ageBuckets ?? [{ label: "すべて", value: "" }] },
            ]}
            rangeCardClassName="mb-5 grid gap-3 md:grid-cols-[220px_220px_auto] rounded-3xl bg-white p-4 ring-1 ring-slate-200/80 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.12)]"
            selectClassName="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-300"
            submitClassName="inline-flex h-11 items-center justify-center rounded-2xl bg-orange-600 px-4 text-sm font-semibold text-white transition hover:bg-orange-700"
          />}
          {user?.currentMode === "TRAINING" || !data ? null : <DashboardKpiGrid
            items={data.kpis}
            cardToneResolver={(_, index) =>
              `rounded-[22px] px-4 py-4 ${index === 0 ? "bg-orange-50/80" : index === 1 ? "bg-amber-50/80" : "bg-slate-50/80"}`
            }
          />}
        </section>
      }
      contentClassName="grid gap-5 xl:grid-cols-2"
    >
      {user?.currentMode === "TRAINING" || !data ? (
        <SectionPanelFrame
          kicker="TRAINING ANALYTICS"
          title="訓練モードでは統計を表示しません"
          description="training は本番 backlog・偏在・応答遅延集計に含めないため、admin 統計は空表示です。"
          className="ds-panel-surface rounded-[28px] p-5 xl:col-span-2"
        >
          <p className="text-sm leading-6 text-slate-600">病院管理、隊管理、事案一覧、設定画面から訓練運用を確認してください。</p>
        </SectionPanelFrame>
      ) : (
      <>
      <AdminWorkbenchSection kicker="WATCH" title="システム全体アラート" description="応答遅延や難渋傾向がある項目を表示します。">
        <AlertList items={data.alerts} tone="orange" />
      </AdminWorkbenchSection>
      <AdminWorkbenchSection kicker="INCIDENT LOAD" title="種別別全体件数" description="全体で多い事案種別です。">
        <DistributionBars items={data.incidentCounts} barTone="orange" />
      </AdminWorkbenchSection>
      <AdminWorkbenchSection kicker="TRANSPORT MIX" title="種別別 搬送 / 不搬送" description="オレンジが搬送、灰色が不搬送です。">
        <DistributionBars items={data.transportByIncident} secondaryLabel="不搬送" barTone="orange" />
      </AdminWorkbenchSection>
      <AdminWorkbenchSection kicker="TOP TEAMS" title="出場件数上位10隊" description="件数ベースの簡易ランキングです。">
        <DistributionBars items={data.topTeams} barTone="orange" />
      </AdminWorkbenchSection>
      <AdminWorkbenchSection kicker="REGIONAL FLOW" title="地域別平均決定時間" description="指令先住所から市区町村相当を抽出しています。">
        <DistributionBars items={data.regionalDecision} valueSuffix="分" barTone="orange" />
      </AdminWorkbenchSection>
      <AdminWorkbenchSection kicker="AGE MIX" title="年齢別要請件数" description="年齢帯ごとの件数です。">
        <DistributionBars items={data.ageGroups} barTone="orange" />
      </AdminWorkbenchSection>
      <AdminWorkbenchSection kicker="HOSPITAL RESPONSE" title="病院別応答遅延" description="平均返信時間が長い順に表示しています。" className="xl:col-span-2">
        <DistributionBars items={data.hospitalDelay} valueSuffix="分" barTone="orange" />
      </AdminWorkbenchSection>
      </>
      )}
    </AnalyticsPageLayout>
  );
}
