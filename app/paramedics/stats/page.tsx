export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { AnalyticsFilterBar, AnalyticsRangeTabs, AnalyticsSection, DistributionBars, TrendBars } from "@/components/analytics/AnalyticsSections";
import { AnalyticsPageLayout } from "@/components/analytics/AnalyticsPageLayout";
import { EmsMetricStrip } from "@/components/ems/EmsMetricStrip";
import { EmsPageHeader } from "@/components/ems/EmsPageHeader";
import { EmsPortalShell } from "@/components/ems/EmsPortalShell";
import { SectionPanelFrame } from "@/components/shared/SectionPanelFrame";
import { getAuthenticatedUser } from "@/lib/authContext";
import { getEmsOperator } from "@/lib/emsOperator";
import { getEmsOperationalMode } from "@/lib/emsSettingsRepository";
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

  const [operator, data, operationalMode] = await Promise.all([
    getEmsOperator(),
    user.currentMode === "TRAINING" ? Promise.resolve(null) : getEmsDashboardData(user.teamId, range, { incidentType, ageBucket }),
    getEmsOperationalMode(user.id),
  ]);
  const isTriage = operationalMode === "TRIAGE";
  const triageSectionClass = "rounded-3xl border border-rose-200 bg-white p-5 shadow-[0_18px_40px_-28px_rgba(190,24,93,0.2)]";
  const analyticsSectionProps = isTriage
    ? {
        className: triageSectionClass,
        titleClassName: "text-lg font-bold text-slate-900",
        descriptionClassName: "mt-1 text-sm text-rose-800",
      }
    : {};

  return (
    <EmsPortalShell operatorName={operator.name} operatorCode={operator.code} currentMode={user.currentMode} operationalMode={operationalMode}>
      <AnalyticsPageLayout
        header={<EmsPageHeader
          eyebrow="EMS STATISTICS"
          title="救急隊統計"
          description={
            user.currentMode === "TRAINING"
              ? "訓練モードでは本番統計を表示しません。training フロー確認は一覧と送信履歴で行ってください。"
              : operationalMode === "TRIAGE"
                ? "トリアージモードでは統計を補助情報として表示します。初動判断はホーム、事案一覧、病院検索を優先してください。"
                : "最近の自隊傾向を、時間、種別、年齢帯で比較しながら、搬送決定までの流れを読み取るための統計画面です。"
          }
          chip={isTriage ? `${data?.rangeLabel ?? "TRAINING"} / TRIAGE` : data?.rangeLabel ?? "TRAINING"}
          tone={isTriage ? "triage" : "standard"}
          actions={[
            { label: "ホーム", href: "/paramedics", variant: "secondary" },
            { label: "病院検索", href: "/hospitals/search", variant: "primary" },
          ]}
        />}
        tabs={user.currentMode === "TRAINING" ? null : <AnalyticsRangeTabs
          basePath="/paramedics/stats"
          activeRange={range}
          activeClassName={isTriage ? "bg-rose-600 text-white ring-rose-600" : undefined}
          inactiveClassName={isTriage ? "bg-white text-rose-700 ring-rose-200 hover:bg-rose-50" : undefined}
        />}
        filters={user.currentMode === "TRAINING" ? null : <AnalyticsFilterBar
          action="/paramedics/stats"
          range={range}
          filters={[
            { name: "incidentType", label: "事案種別", value: data?.activeFilters.incidentType ?? "", options: data?.filterOptions.incidentTypes ?? [{ label: "すべて", value: "" }] },
            { name: "ageBucket", label: "年齢帯", value: data?.activeFilters.ageBucket ?? "", options: data?.filterOptions.ageBuckets ?? [{ label: "すべて", value: "" }] },
          ]}
          submitClassName={isTriage ? "h-10 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-500" : undefined}
          rangeCardClassName={isTriage ? "mb-5 flex flex-wrap items-end gap-3 rounded-3xl border border-rose-200 bg-white p-4 shadow-[0_18px_40px_-28px_rgba(190,24,93,0.18)]" : undefined}
          selectClassName={isTriage ? "h-10 w-full rounded-xl border border-rose-200 bg-white px-3 text-sm text-slate-700" : undefined}
        />}
        summary={user.currentMode === "TRAINING" || !data ? null : <EmsMetricStrip operationTone={isTriage ? "triage" : "standard"} title="RANGE SUMMARY" items={data.kpis.map((item) => ({ label: item.label, value: item.value, hint: item.hint }))} />}
      >
        {user.currentMode === "TRAINING" || !data ? (
          <SectionPanelFrame
            kicker="TRAINING ANALYTICS"
            title="訓練モードでは統計を表示しません"
            description="training 事案は本番集計から除外しているため、統計ページは空表示です。"
            className="ds-panel-surface rounded-[28px] p-5 xl:col-span-2"
          >
            <p className="text-sm leading-6 text-slate-600">新規事案作成、送信履歴、病院検索を使って訓練フローを確認してください。</p>
          </SectionPanelFrame>
        ) : (
        <>
        <AnalyticsSection title="種別ごと出場件数" description="最近よく発生している事案種別の件数です。" {...analyticsSectionProps}>
          <DistributionBars items={data.incidentCounts} barTone={isTriage ? "rose" : "blue"} />
        </AnalyticsSection>
        <AnalyticsSection title="種別ごとの搬送 / 不搬送" description={isTriage ? "赤が搬送、灰色が不搬送です。" : "青が搬送、灰色が不搬送です。"} {...analyticsSectionProps}>
          <DistributionBars items={data.transportByIncident} secondaryLabel="不搬送" barTone={isTriage ? "rose" : "blue"} />
        </AnalyticsSection>
        <AnalyticsSection title="送信〜HP決定 推移" description="日別の平均決定時間です。" {...analyticsSectionProps}>
          <TrendBars items={data.decisionTrend} barTone={isTriage ? "rose" : "emerald"} />
        </AnalyticsSection>
        <AnalyticsSection title="年齢別要請件数" description="患者年齢をざっくり区分して表示しています。" {...analyticsSectionProps}>
          <DistributionBars items={data.ageGroups} barTone={isTriage ? "rose" : "blue"} />
        </AnalyticsSection>
        <AnalyticsSection title="時間帯別の平均決定時間" description="送信時刻ベースで集計しています。" {...analyticsSectionProps}>
          <TrendBars items={data.hourlyDecision} barTone={isTriage ? "rose" : "emerald"} />
        </AnalyticsSection>
        <AnalyticsSection title="曜日別の平均決定時間" description="曜日ごとの差を確認できます。" {...analyticsSectionProps}>
          <TrendBars items={data.weekdayDecision} barTone={isTriage ? "rose" : "emerald"} />
        </AnalyticsSection>
        </>
        )}
      </AnalyticsPageLayout>
    </EmsPortalShell>
  );
}
