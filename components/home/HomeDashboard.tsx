"use client";

import Link from "next/link";
import {
  BuildingOffice2Icon,
  ChartBarIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  PlusCircleIcon,
  RectangleStackIcon,
} from "@heroicons/react/24/solid";

import { AnalyticsHeader, AnalyticsSection, DashboardKpiGrid, DistributionBars } from "@/components/analytics/AnalyticsSections";
import { EmsPortalShell } from "@/components/ems/EmsPortalShell";
import type { EmsDashboardData } from "@/lib/dashboardAnalytics";

type HomeDashboardProps = {
  operatorName: string;
  operatorCode: string;
  data: EmsDashboardData;
};

const quickLinks = [
  { href: "/cases/new", label: "新規事案作成", description: "新しい事案を登録します。", Icon: PlusCircleIcon },
  { href: "/cases", label: "事案一覧", description: "登録済みの事案を確認します。", Icon: RectangleStackIcon },
  { href: "/cases/search", label: "送信履歴", description: "事案検索と送信状況を確認します。", Icon: MagnifyingGlassIcon },
  { href: "/hospitals/search", label: "病院検索", description: "搬送先候補の検索へ移動します。", Icon: BuildingOffice2Icon },
  { href: "/paramedics/stats", label: "統計ページ", description: "詳細な傾向分析を開きます。", Icon: ChartBarIcon },
  { href: "/settings", label: "設定", description: "端末や表示設定を見直します。", Icon: Cog6ToothIcon },
] as const;

export function HomeDashboard({ operatorName, operatorCode, data }: HomeDashboardProps) {
  return (
    <EmsPortalShell operatorName={operatorName} operatorCode={operatorCode}>
      <div className="page-frame page-frame--wide page-stack page-stack--lg w-full min-w-0">
        <AnalyticsHeader eyebrow="EMS PORTAL" title="救急隊ホーム" description="現在進行中の監視ではなく、最近の自隊傾向を短時間で把握する画面です。" rangeLabel={data.rangeLabel} />
        <DashboardKpiGrid items={data.kpis.slice(0, 4)} />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <AnalyticsSection title="種別ごと出場件数" description="最近よく発生している事案種別です。">
            <DistributionBars items={data.incidentCounts.slice(0, 8)} />
          </AnalyticsSection>
          <AnalyticsSection title="主要導線" description="頻繁に使う画面へすぐ移動できます。">
            <div className="grid gap-3 md:grid-cols-2">
              {quickLinks.map((item) => (
                <Link key={item.href} href={item.href} className="group rounded-2xl bg-slate-50/85 p-4 ring-1 ring-slate-200/80 transition hover:bg-white hover:ring-slate-300">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-200/80">
                      <item.Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </AnalyticsSection>
        </div>
        <AnalyticsSection title="種別ごとの搬送 / 不搬送" description="ホームでは上位だけを載せ、詳細は統計ページへ寄せています。">
          <DistributionBars items={data.transportByIncident.slice(0, 8)} secondaryLabel="不搬送" />
        </AnalyticsSection>
      </div>
    </EmsPortalShell>
  );
}
