"use client";

import Link from "next/link";
import {
  ArrowTrendingUpIcon,
  BuildingOffice2Icon,
  ChartBarIcon,
  ClockIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  PlusCircleIcon,
  RectangleStackIcon,
} from "@heroicons/react/24/solid";

import { EmsPortalShell } from "@/components/ems/EmsPortalShell";
import { ActionLinkPanel } from "@/components/shared/ActionLinkPanel";
import { DashboardHeroShell } from "@/components/shared/DashboardHeroShell";
import { KpiBacklogSection } from "@/components/shared/KpiBacklogSection";
import { KpiPanel } from "@/components/shared/KpiPanel";
import { MetricPanelFrame } from "@/components/shared/MetricPanelFrame";
import { UserModeBadge } from "@/components/shared/UserModeBadge";
import type { DistributionItem, EmsDashboardData } from "@/lib/dashboardAnalytics";
import type { AppMode } from "@/lib/appMode";

type HomeDashboardProps = {
  operatorName: string;
  operatorCode: string;
  currentMode: AppMode;
  data: EmsDashboardData | null;
};

const quickLinks = [
  { href: "/cases/new", label: "新規事案作成", description: "現場入力を開始", Icon: PlusCircleIcon },
  { href: "/cases", label: "事案一覧", description: "進行中と履歴の確認", Icon: RectangleStackIcon },
  { href: "/cases/search", label: "送信履歴", description: "照会状況と応答を確認", Icon: MagnifyingGlassIcon },
  { href: "/hospitals/search", label: "病院検索", description: "候補比較と送信", Icon: BuildingOffice2Icon },
  { href: "/paramedics/stats", label: "統計ページ", description: "詳細傾向を確認", Icon: ChartBarIcon },
  { href: "/settings", label: "設定", description: "端末と表示を調整", Icon: Cog6ToothIcon },
] as const;

function CompactBars({
  title,
  description,
  items,
  valueSuffix = "件",
  icon,
}: {
  title: string;
  description: string;
  items: DistributionItem[];
  valueSuffix?: string;
  icon: React.ReactNode;
}) {
  const max = Math.max(...items.map((item) => Math.max(item.value, item.secondaryValue ?? 0)), 1);

  return (
    <MetricPanelFrame
      kicker={title}
      title={description}
      icon={icon}
      className="rounded-[26px] bg-white px-4 py-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.22)]"
      headerClassName="mb-3 flex items-start justify-between gap-3"
      kickerClassName="text-[10px] font-semibold tracking-[0.18em] text-slate-400"
      titleClassName="mt-1 text-base font-bold tracking-tight text-slate-900"
      iconClassName="mt-0.5 flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"
    >
      <div className="space-y-2.5">
        {items.length === 0 ? <p className="text-sm text-slate-500">データがありません。</p> : null}
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-slate-800">{item.label}</p>
                {item.secondaryValue != null ? (
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {item.secondaryLabel ?? "補助"} {item.secondaryValue}
                    {valueSuffix}
                  </p>
                ) : null}
              </div>
              <p className="shrink-0 text-[11px] font-semibold text-slate-500">
                {item.value}
                {valueSuffix}
              </p>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-blue-600" style={{ width: `${(item.value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </MetricPanelFrame>
  );
}

export function HomeDashboard({ operatorName, operatorCode, currentMode, data }: HomeDashboardProps) {
  const leadKpis = data?.kpis.slice(0, 4) ?? [];
  const supportKpis = data?.kpis.slice(4) ?? [];

  return (
    <EmsPortalShell operatorName={operatorName} operatorCode={operatorCode} currentMode={currentMode}>
      <div className="page-frame page-frame--wide w-full min-w-0">
        <div className="page-stack gap-5">
          <DashboardHeroShell
            eyebrow="EMS FIELD DESK"
            title="救急隊ホーム"
            description={
              <>
                現在の監視ではなく、自隊の最近の傾向と直近の行動導線を短時間で把握するためのホームです。
                <span className="mx-1 font-semibold text-slate-900">{data?.rangeLabel ?? "TRAINING"}</span>
                を基準にしています。
              </>
            }
            actions={
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold tracking-[0.14em] text-slate-600">tablet landscape</span>
                <Link
                  href="/hospitals/search"
                  className="inline-flex h-10 items-center rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  病院検索へ
                </Link>
              </div>
            }
            className="overflow-hidden rounded-[30px] bg-[linear-gradient(135deg,#eff6ff_0%,#f8fafc_40%,#dbeafe_100%)] px-5 py-5 shadow-[0_22px_54px_-40px_rgba(37,99,235,0.28)] xl:px-6"
            eyebrowClassName="text-[10px] font-semibold tracking-[0.22em] text-blue-500"
            bodyClassName="mt-5"
          >
            {currentMode === "TRAINING" || !data ? (
              <div className="rounded-[24px] bg-white/92 p-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.22)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.18em] text-amber-600">TRAINING ANALYTICS</p>
                    <h2 className="mt-1 text-lg font-bold text-slate-900">訓練モードでは本番集計を表示しません</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">training 事案は本番 KPI に混入させない方針のため、統計は空表示です。訓練フローの確認は作成、送信、相談、搬送決定の導線から行ってください。</p>
                  </div>
                  <UserModeBadge mode={currentMode} />
                </div>
                <div className="mt-5">
                  <ActionLinkPanel
                    kicker="FAST ACTIONS"
                    title="訓練導線"
                    badge="training only"
                    items={quickLinks.map((item) => ({
                      href: item.href,
                      label: item.label,
                      description: item.description,
                      icon: <item.Icon className="h-5 w-5" aria-hidden />,
                    }))}
                    columnsClassName=""
                    panelClassName="rounded-[22px] bg-slate-50/95 px-4 py-4"
                    itemClassName="rounded-[18px] bg-white px-4 py-4 transition hover:bg-slate-50"
                    itemIconClassName="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"
                  />
                </div>
              </div>
            ) : (
            <KpiBacklogSection
                layoutClassName="xl:grid-cols-[minmax(0,1.22fr)_minmax(320px,0.9fr)]"
                summary={
                  <div className="grid gap-4 xl:grid-cols-2">
                    <CompactBars
                      title="INCIDENT MIX"
                      description="種別ごとの出場件数"
                      items={data.incidentCounts.slice(0, 6)}
                      icon={<ArrowTrendingUpIcon className="h-4.5 w-4.5" aria-hidden />}
                    />
                    <CompactBars
                      title="TRANSPORT RESULT"
                      description="搬送 / 不搬送割合"
                      items={data.transportByIncident.slice(0, 6)}
                      icon={<ClockIcon className="h-4.5 w-4.5" aria-hidden />}
                    />

                    <KpiPanel
                      kicker="AVERAGE TIME KPI"
                      title="平均時間KPI"
                      badge={
                        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                          <ClockIcon className="h-4.5 w-4.5" aria-hidden />
                        </div>
                      }
                      className="shadow-[0_18px_42px_-34px_rgba(15,23,42,0.22)]"
                    >
                      <div className="grid gap-3 sm:grid-cols-2">
                        {leadKpis.map((item) => (
                          <article key={item.label} className="rounded-[18px] bg-slate-50/90 px-4 py-4">
                            <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400">{item.label}</p>
                            <p className="mt-2 text-[23px] font-bold tracking-[-0.03em] text-slate-950">{item.value}</p>
                            <p className="mt-1 text-[11px] leading-5 text-slate-500">{item.hint ?? "直近傾向として継続確認"}</p>
                          </article>
                        ))}
                      </div>
                    </KpiPanel>

                    <KpiPanel
                      kicker="QUICK READ"
                      title="補助指標"
                      badge={
                        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                          <ChartBarIcon className="h-4.5 w-4.5" aria-hidden />
                        </div>
                      }
                      className="shadow-[0_18px_42px_-34px_rgba(15,23,42,0.22)]"
                    >
                      <div className="space-y-3">
                        {supportKpis.map((item) => (
                          <div key={item.label} className="rounded-[18px] bg-slate-50/90 px-4 py-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="text-[12px] font-semibold leading-5 text-slate-800">{item.label}</p>
                                <p className="mt-0.5 text-[11px] leading-5 text-slate-500">{item.hint ?? "統計ページで詳細確認"}</p>
                              </div>
                              <p className="shrink-0 whitespace-nowrap text-sm font-bold tracking-tight text-slate-950">{item.value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </KpiPanel>
                  </div>
                }
                rail={
                  <ActionLinkPanel
                    kicker="FAST ACTIONS"
                    title="現場導線"
                    badge="すぐ移動"
                    items={quickLinks.map((item) => ({
                      href: item.href,
                      label: item.label,
                      description: item.description,
                      icon: <item.Icon className="h-5 w-5" aria-hidden />,
                    }))}
                    columnsClassName=""
                    panelClassName="rounded-[26px] bg-white/92 px-5 py-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.22)]"
                    itemClassName="rounded-[20px] bg-slate-50/95 px-4 py-4 transition hover:bg-white"
                    itemIconClassName="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-700"
                  />
                }
              />
            )}
          </DashboardHeroShell>
        </div>
      </div>
    </EmsPortalShell>
  );
}
