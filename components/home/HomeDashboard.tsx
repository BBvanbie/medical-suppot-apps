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
import type { DistributionItem, EmsDashboardData } from "@/lib/dashboardAnalytics";

type HomeDashboardProps = {
  operatorName: string;
  operatorCode: string;
  data: EmsDashboardData;
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
    <section className="rounded-[26px] bg-white px-4 py-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.22)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] text-slate-400">{title}</p>
          <h2 className="mt-1 text-base font-bold tracking-tight text-slate-900">{description}</h2>
        </div>
        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          {icon}
        </div>
      </div>
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
    </section>
  );
}

export function HomeDashboard({ operatorName, operatorCode, data }: HomeDashboardProps) {
  const leadKpis = data.kpis.slice(0, 4);
  const supportKpis = data.kpis.slice(4);

  return (
    <EmsPortalShell operatorName={operatorName} operatorCode={operatorCode}>
      <div className="page-frame page-frame--wide w-full min-w-0">
        <div className="page-stack gap-5">
          <section className="overflow-hidden rounded-[30px] bg-[linear-gradient(135deg,#eff6ff_0%,#f8fafc_40%,#dbeafe_100%)] px-5 py-5 shadow-[0_22px_54px_-40px_rgba(37,99,235,0.28)] xl:px-6">
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold tracking-[0.22em] text-blue-500">EMS FIELD DESK</p>
                  <h1 className="mt-2 text-[28px] font-bold tracking-[-0.03em] text-slate-950">救急隊ホーム</h1>
                  <p className="mt-2 max-w-none text-[13px] leading-6 text-slate-600">
                    現在の監視ではなく、自隊の最近の傾向と直近の行動導線を短時間で把握するためのホームです。
                    <span className="mx-1 font-semibold text-slate-900">{data.rangeLabel}</span>
                    を基準にしています。
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold tracking-[0.14em] text-slate-600">tablet landscape</span>
                  <Link
                    href="/hospitals/search"
                    className="inline-flex h-10 items-center rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    病院検索へ
                  </Link>
                </div>
              </div>

              <section className="rounded-[26px] bg-white/92 px-5 py-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.22)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold tracking-[0.18em] text-blue-500">FAST ACTIONS</p>
                    <h2 className="mt-1 text-base font-bold tracking-tight text-slate-900">現場導線</h2>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-semibold text-blue-700">すぐ移動</span>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3 2xl:grid-cols-6">
                  {quickLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-[20px] bg-slate-50/95 px-4 py-4 transition hover:bg-white"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-700">
                          <item.Icon className="h-4.5 w-4.5" aria-hidden />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold leading-5 text-slate-900">{item.label}</p>
                          <p className="mt-0.5 text-[11px] leading-5 text-slate-500">{item.description}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

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

                <section className="rounded-[26px] bg-white px-5 py-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.22)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold tracking-[0.18em] text-slate-400">AVERAGE TIME KPI</p>
                      <h2 className="mt-1 text-base font-bold tracking-tight text-slate-900">平均時間KPI</h2>
                    </div>
                    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                      <ClockIcon className="h-4.5 w-4.5" aria-hidden />
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {leadKpis.map((item) => (
                      <article key={item.label} className="rounded-[18px] bg-slate-50/90 px-4 py-4">
                        <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400">{item.label}</p>
                        <p className="mt-2 text-[23px] font-bold tracking-[-0.03em] text-slate-950">{item.value}</p>
                        <p className="mt-1 text-[11px] leading-5 text-slate-500">{item.hint ?? "直近傾向として継続確認"}</p>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="rounded-[26px] bg-white px-5 py-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.22)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold tracking-[0.18em] text-slate-400">QUICK READ</p>
                      <h2 className="mt-1 text-base font-bold tracking-tight text-slate-900">補助指標</h2>
                    </div>
                    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                      <ChartBarIcon className="h-4.5 w-4.5" aria-hidden />
                    </div>
                  </div>
                  <div className="mt-3 space-y-3">
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
                </section>
              </div>
            </div>
          </section>
        </div>
      </div>
    </EmsPortalShell>
  );
}
