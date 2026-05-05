export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { AnalyticsFilterBar, AnalyticsHeader, AnalyticsRangeTabs, AnalyticsSection, DashboardKpiGrid, DistributionBars, PendingList, TrendBars } from "@/components/analytics/AnalyticsSections";
import { AnalyticsPageLayout } from "@/components/analytics/AnalyticsPageLayout";
import { HospitalPortalShell } from "@/components/hospitals/HospitalPortalShell";
import { SectionPanelFrame } from "@/components/shared/SectionPanelFrame";
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
    user.currentMode === "TRAINING" ? Promise.resolve(null) : getHospitalDashboardData(user.hospitalId, range, { department }),
  ]);

  return (
    <HospitalPortalShell hospitalName={operator.name} hospitalCode={operator.code} currentMode={user.currentMode}>
      <AnalyticsPageLayout
        header={<AnalyticsHeader eyebrow="HOSPITAL STATISTICS" title="病院統計" description={user.currentMode === "TRAINING" ? "訓練モードでは本番統計を表示しません。training 受入フロー確認は一覧画面で行ってください。" : "backlog、応答速度、相談後受入の傾向を確認します。"} rangeLabel={data?.rangeLabel ?? "TRAINING"} />}
        tabs={user.currentMode === "TRAINING" ? null : <AnalyticsRangeTabs basePath="/hospitals/stats" activeRange={range} />}
        filters={user.currentMode === "TRAINING" ? null : <AnalyticsFilterBar
          action="/hospitals/stats"
          range={range}
          filters={[
            { name: "department", label: "科目", value: data?.activeFilters.department ?? "", options: data?.filterOptions.departments ?? [{ label: "すべて", value: "" }] },
          ]}
        />}
        summary={user.currentMode === "TRAINING" || !data ? null : <DashboardKpiGrid items={[...data.backlogKpis, ...data.timingKpis]} />}
      >
        {user.currentMode === "TRAINING" || !data ? (
          <SectionPanelFrame
            kicker="TRAINING ANALYTICS"
            title="訓練モードでは統計を表示しません"
            description="training 要請は本番 KPI に混入させないため、統計ページは空表示です。"
            className="ds-panel-surface ds-radius-hero p-5 xl:col-span-2"
          >
            <p className="text-sm leading-6 text-slate-600">受入要請一覧、相談一覧、患者一覧から訓練フローを確認してください。</p>
          </SectionPanelFrame>
        ) : (
        <>
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
        </>
        )}
      </AnalyticsPageLayout>
    </HospitalPortalShell>
  );
}
