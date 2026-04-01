export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  BuildingOffice2Icon,
  ChartBarIcon,
  Cog6ToothIcon,
  DocumentMagnifyingGlassIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  Squares2X2Icon,
  TruckIcon,
  UserGroupIcon,
} from "@heroicons/react/24/solid";

import { getAdminDashboardData } from "@/lib/dashboardAnalytics";

const quickLinks = [
  {
    href: "/admin/hospitals",
    label: "病院管理",
    description: "応答遅延や受入偏りの確認",
    Icon: BuildingOffice2Icon,
  },
  {
    href: "/admin/ambulance-teams",
    label: "救急隊管理",
    description: "出場傾向と運用状況の確認",
    Icon: TruckIcon,
  },
  {
    href: "/admin/users",
    label: "ユーザー管理",
    description: "権限と所属の調整",
    Icon: UserGroupIcon,
  },
  {
    href: "/admin/devices",
    label: "端末管理",
    description: "失効や割当の確認",
    Icon: ShieldExclamationIcon,
  },
  {
    href: "/admin/cases",
    label: "事案一覧",
    description: "難渋・滞留案件の確認",
    Icon: DocumentTextIcon,
  },
  {
    href: "/admin/logs",
    label: "監査ログ",
    description: "操作履歴の追跡",
    Icon: DocumentMagnifyingGlassIcon,
  },
  {
    href: "/admin/orgs",
    label: "組織管理",
    description: "並び順と有効状態の管理",
    Icon: Squares2X2Icon,
  },
  {
    href: "/admin/stats",
    label: "統計ページ",
    description: "全体統計を詳細確認",
    Icon: ChartBarIcon,
  },
  {
    href: "/admin/settings",
    label: "マスタ管理",
    description: "設定値と運用定義の調整",
    Icon: Cog6ToothIcon,
  },
] as const;

function getAlertTone(index: number) {
  if (index === 0) return "bg-rose-50 text-rose-900";
  if (index === 1) return "bg-amber-50 text-amber-900";
  return "bg-slate-100 text-slate-700";
}

function CompactMetricList({
  title,
  description,
  items,
  valueSuffix = "",
  icon,
}: {
  title: string;
  description: string;
  items: Array<{ label: string; value: number; secondaryValue?: number; secondaryLabel?: string }>;
  valueSuffix?: string;
  icon: React.ReactNode;
}) {
  const max = Math.max(...items.map((item) => Math.max(item.value, item.secondaryValue ?? 0)), 1);

  return (
    <section className="rounded-[28px] bg-white px-5 py-5 shadow-[0_20px_44px_-36px_rgba(15,23,42,0.28)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-400">{title}</p>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900">{description}</h2>
        </div>
        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          {icon}
        </div>
      </div>
      <div className="space-y-3">
        {items.length === 0 ? <p className="text-sm text-slate-500">データがありません。</p> : null}
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-1.5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-slate-800">{item.label}</p>
                {item.secondaryValue != null ? (
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {item.secondaryLabel ?? "補助"} {item.secondaryValue}
                    {valueSuffix}
                  </p>
                ) : null}
              </div>
              <p className="shrink-0 text-[12px] font-semibold text-slate-500">
                {item.value}
                {valueSuffix}
              </p>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-slate-900" style={{ width: `${(item.value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function AdminPage() {
  const data = await getAdminDashboardData("30d");
  const leadAlert = data.alerts[0] ?? "大きな滞留アラートは検知されていません。";
  const remainingAlerts = data.alerts.slice(1, 5);

  return (
    <div className="page-frame page-frame--wide w-full min-w-0">
      <div className="page-stack gap-6">
        <section className="overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#f8fafc_0%,#f1f5f9_48%,#e2e8f0_100%)] px-6 py-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] xl:px-7">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold tracking-[0.22em] text-slate-400">ADMIN CONTROL DESK</p>
                  <h1 className="mt-2 text-[30px] font-bold tracking-[-0.03em] text-slate-950">管理ホーム</h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    全体監視、滞留介入、運用管理導線を同じ視線上で扱うためのホームです。対象期間は
                    <span className="mx-1 font-semibold text-slate-900">{data.rangeLabel}</span>
                    です。
                  </p>
                </div>
                <Link
                  href="/admin/stats"
                  className="inline-flex h-10 items-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  全体統計を開く
                </Link>
              </div>

              <div className="mt-6 rounded-[26px] bg-white/90 px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                    <ExclamationTriangleIcon className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold tracking-[0.18em] text-rose-500">PRIORITY WATCH</p>
                    <p className="mt-1 text-base font-semibold leading-6 text-slate-950">{leadAlert}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      まずはこの画面で滞留要因を把握し、必要な管理画面へ直接介入できる導線を優先しています。
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-3">
                {data.kpis.map((item) => (
                  <article key={item.label} className="rounded-[24px] bg-white/88 px-4 py-4">
                    <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400">{item.label}</p>
                    <p className="mt-2 text-[26px] font-bold tracking-[-0.03em] text-slate-950">{item.value}</p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500">{item.hint ?? "監視基準値として継続確認"}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              <section className="rounded-[28px] bg-slate-950 px-5 py-5 text-white shadow-[0_20px_48px_-38px_rgba(15,23,42,0.55)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-400">INTERVENTION TARGETS</p>
                    <h2 className="mt-1 text-lg font-bold tracking-tight text-white">直近の介入候補</h2>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-slate-200">
                    {data.alerts.length}項目
                  </span>
                </div>
                <div className="mt-4 space-y-2.5">
                  {data.alerts.slice(0, 5).map((item, index) => (
                    <div key={`${item}-${index}`} className="rounded-2xl bg-white/6 px-3.5 py-3">
                      <p className="text-sm leading-6 text-slate-100">{item}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[28px] bg-white px-5 py-5 shadow-[0_20px_44px_-36px_rgba(15,23,42,0.28)]">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-400">ROUTES</p>
                    <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900">管理導線</h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">PC前提</span>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {quickLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group rounded-[20px] bg-slate-50/90 px-4 py-3 transition hover:bg-slate-100"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700">
                          <item.Icon className="h-5 w-5" aria-hidden />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                          <p className="mt-1 text-[11px] leading-5 text-slate-500">{item.description}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.05fr)_minmax(320px,0.9fr)]">
          <CompactMetricList
            title="SYSTEM LOAD"
            description="事案種別ごとの全体件数"
            items={data.incidentCounts.slice(0, 8)}
            icon={<ChartBarIcon className="h-5 w-5" aria-hidden />}
          />
          <CompactMetricList
            title="TEAMS"
            description="出場件数上位の救急隊"
            items={data.topTeams.slice(0, 8)}
            icon={<ArrowTrendingUpIcon className="h-5 w-5" aria-hidden />}
          />
          <section className="rounded-[28px] bg-white px-5 py-5 shadow-[0_20px_44px_-36px_rgba(15,23,42,0.28)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-400">WATCH LIST</p>
                <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900">補助アラート</h2>
              </div>
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                <ShieldExclamationIcon className="h-5 w-5" aria-hidden />
              </div>
            </div>
            <div className="space-y-2.5">
              {remainingAlerts.length === 0 ? <p className="text-sm text-slate-500">追加アラートはありません。</p> : null}
              {remainingAlerts.map((item, index) => (
                <div key={`${item}-${index}`} className={`rounded-2xl px-3.5 py-3 ${getAlertTone(index)}`}>
                  <p className="text-sm leading-6">{item}</p>
                </div>
              ))}
            </div>
          </section>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <CompactMetricList
            title="HOSPITAL RESPONSE"
            description="返信時間が長い病院"
            items={data.hospitalDelay.slice(0, 8)}
            valueSuffix="分"
            icon={<ArrowTrendingDownIcon className="h-5 w-5" aria-hidden />}
          />
          <CompactMetricList
            title="REGIONAL DECISION"
            description="地域別の搬送決定時間"
            items={data.regionalDecision.slice(0, 8)}
            valueSuffix="分"
            icon={<DocumentTextIcon className="h-5 w-5" aria-hidden />}
          />
        </section>
      </div>
    </div>
  );
}
