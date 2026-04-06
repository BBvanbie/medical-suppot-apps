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

import { ActionLinkPanel } from "@/components/shared/ActionLinkPanel";
import { DashboardHeroShell } from "@/components/shared/DashboardHeroShell";
import { KpiBacklogSection } from "@/components/shared/KpiBacklogSection";
import { MetricPanelFrame } from "@/components/shared/MetricPanelFrame";
import { PriorityListPanel } from "@/components/shared/PriorityListPanel";
import { WatchCallout } from "@/components/shared/WatchCallout";
import { getAuthenticatedUser } from "@/lib/authContext";
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
    <MetricPanelFrame kicker={title} title={description} icon={icon}>
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
    </MetricPanelFrame>
  );
}

export default async function AdminPage() {
  const user = await getAuthenticatedUser();
  const data = user?.currentMode === "TRAINING" ? null : await getAdminDashboardData("30d");
  const leadAlert = data?.alerts[0] ?? "大きな滞留アラートは検知されていません。";
  const remainingAlerts = data?.alerts.slice(1, 5) ?? [];
  const problemDrillDownItems = [
    {
      href: "/admin/cases?problem=selection_stalled",
      label: "選定停滞",
      description: "搬送決定まで止まっている案件を確認",
      icon: <ExclamationTriangleIcon className="h-5 w-5" aria-hidden />,
    },
    {
      href: "/admin/cases?problem=consult_stalled",
      label: "要相談停滞",
      description: "相談継続のまま止まっている案件を確認",
      icon: <ShieldExclamationIcon className="h-5 w-5" aria-hidden />,
    },
    {
      href: "/admin/cases?problem=reply_delay",
      label: "返信遅延",
      description: "既読後の未返信案件を確認",
      icon: <ArrowTrendingDownIcon className="h-5 w-5" aria-hidden />,
    },
  ];

  return (
    <div className="page-frame page-frame--wide w-full min-w-0">
      <div className="page-stack gap-6">
        <DashboardHeroShell
          eyebrow="ADMIN CONTROL DESK"
          title="管理ホーム"
          description={
            <>
              全体監視、滞留介入、運用管理導線を同じ視線上で扱うためのホームです。対象期間は
              <span className="mx-1 font-semibold text-slate-900">{data?.rangeLabel ?? "TRAINING"}</span>
              です。
            </>
          }
          actions={
            <Link
              href="/admin/stats"
              className="inline-flex h-10 items-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              全体統計を開く
            </Link>
          }
          className="overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#f8fafc_0%,#f1f5f9_48%,#e2e8f0_100%)] px-6 py-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] xl:px-7"
          eyebrowClassName="text-[11px] font-semibold tracking-[0.22em] text-slate-400"
        >
          {user?.currentMode === "TRAINING" || !data ? (
            <div className="rounded-[26px] bg-white/92 px-5 py-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.22)]">
              <p className="text-[11px] font-semibold tracking-[0.18em] text-amber-600">TRAINING ANALYTICS</p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">訓練モードでは本番監視指標を表示しません</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Admin は TRAINING でもモード切替で監視しますが、本番 backlog・遅延・偏在集計には training データを混入させません。管理導線だけを使って設定や一覧確認へ進んでください。</p>
              <div className="mt-5">
                <ActionLinkPanel
                  kicker="ROUTES"
                  title="管理導線"
                  badge="training only"
                  items={quickLinks.map((item) => ({
                    href: item.href,
                    label: item.label,
                    description: item.description,
                    icon: <item.Icon className="h-5 w-5" aria-hidden />,
                  }))}
                />
              </div>
            </div>
          ) : (
          <KpiBacklogSection
            layoutClassName="xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]"
            summary={
              <div className="min-w-0">
                <WatchCallout
                  kicker="PRIORITY WATCH"
                  message={leadAlert}
                  description="まずはこの画面で滞留要因を把握し、必要な管理画面へ直接介入できる導線を優先しています。"
                  icon={<ExclamationTriangleIcon className="h-5 w-5" aria-hidden />}
                  iconClassName="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700"
                  kickerClassName="text-[11px] font-semibold tracking-[0.18em] text-rose-500"
                />
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
            }
            rail={
              <>
                <PriorityListPanel
                  kicker="INTERVENTION TARGETS"
                  title="直近の介入候補"
                  badge={`${data.alerts.length}項目`}
                  items={data.alerts.slice(0, 5).map((item, index) => (
                    <div key={`${item}-${index}`} className="rounded-2xl bg-white/6 px-3.5 py-3">
                      <p className="text-sm leading-6 text-slate-100">{item}</p>
                    </div>
                  ))}
                  emptyMessage="介入候補はありません。"
                />
                <ActionLinkPanel
                  kicker="ROUTES"
                  title="管理導線"
                  badge="PC前提"
                  items={quickLinks.map((item) => ({
                    href: item.href,
                    label: item.label,
                    description: item.description,
                    icon: <item.Icon className="h-5 w-5" aria-hidden />,
                  }))}
                />
              </>
            }
          />
          )}
        </DashboardHeroShell>

        {data ? (
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
          <MetricPanelFrame
            kicker="WATCH LIST"
            title="補助アラート"
            icon={<ShieldExclamationIcon className="h-5 w-5" aria-hidden />}
            iconClassName="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-50 text-amber-700"
          >
            <div className="space-y-2.5">
              {remainingAlerts.length === 0 ? <p className="text-sm text-slate-500">追加アラートはありません。</p> : null}
              {remainingAlerts.map((item, index) => (
                <div key={`${item}-${index}`} className={`rounded-2xl px-3.5 py-3 ${getAlertTone(index)}`}>
                  <p className="text-sm leading-6">{item}</p>
                </div>
              ))}
            </div>
          </MetricPanelFrame>
        </section>
        ) : null}

        {data ? (
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
        ) : null}

        {data ? (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <ActionLinkPanel
              kicker="PROBLEM DRILL-DOWN"
              title="問題カテゴリ別に確認"
              badge="admin"
              items={problemDrillDownItems}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <MetricPanelFrame
                kicker="HOSPITAL DRILL-DOWN"
                title="病院別に確認"
                icon={<BuildingOffice2Icon className="h-5 w-5" aria-hidden />}
              >
                <div className="space-y-2.5">
                  {data.hospitalDelay.slice(0, 4).map((item) => (
                    <Link
                      key={item.label}
                      href={`/admin/cases?hospitalName=${encodeURIComponent(item.label)}`}
                      className="block rounded-2xl bg-slate-50 px-3.5 py-3 transition hover:bg-orange-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                          <p className="mt-1 text-[11px] leading-5 text-slate-500">返信遅延の案件一覧へ</p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-orange-700">{item.value}分</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </MetricPanelFrame>
              <MetricPanelFrame
                kicker="REGIONAL DRILL-DOWN"
                title="地域別に確認"
                icon={<DocumentTextIcon className="h-5 w-5" aria-hidden />}
              >
                <div className="space-y-2.5">
                  {data.regionalDecision.slice(0, 4).map((item) => (
                    <Link
                      key={item.label}
                      href={`/admin/cases?area=${encodeURIComponent(item.label)}`}
                      className="block rounded-2xl bg-slate-50 px-3.5 py-3 transition hover:bg-orange-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                          <p className="mt-1 text-[11px] leading-5 text-slate-500">地域案件一覧へ</p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-orange-700">{item.value}分</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </MetricPanelFrame>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
