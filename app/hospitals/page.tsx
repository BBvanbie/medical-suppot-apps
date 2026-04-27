export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowPathIcon,
  BuildingOffice2Icon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InboxStackIcon,
  LifebuoyIcon,
  RectangleStackIcon,
} from "@heroicons/react/24/solid";

import { HospitalPortalShell } from "@/components/hospitals/HospitalPortalShell";
import { ActionLinkPanel } from "@/components/shared/ActionLinkPanel";
import { DashboardHeroShell } from "@/components/shared/DashboardHeroShell";
import { KpiBacklogSection } from "@/components/shared/KpiBacklogSection";
import { MetricPanelFrame } from "@/components/shared/MetricPanelFrame";
import { PriorityListPanel } from "@/components/shared/PriorityListPanel";
import { WatchCallout } from "@/components/shared/WatchCallout";
import { getAuthenticatedUser } from "@/lib/authContext";
import { getHospitalDashboardData } from "@/lib/dashboardAnalytics";
import { hospitalNavItems } from "@/lib/hospitalNavItems";
import { getHospitalOperator } from "@/lib/hospitalOperator";

function CompactMetricList({
  title,
  description,
  items,
  valueSuffix = "件",
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
              <div className="h-full rounded-full bg-emerald-700" style={{ width: `${(item.value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </MetricPanelFrame>
  );
}

const hospitalTrainingLinks = [
  {
    href: "/hp/settings/mode",
    label: "mode 切替",
    description: "TRAINING 継続確認と LIVE への戻しはここで行います。",
    Icon: RectangleStackIcon,
  },
  {
    href: "/hospitals/requests",
    label: "受入要請一覧",
    description: "訓練中の最初の確認先です。未読と未返信をここから見ます。",
    Icon: InboxStackIcon,
  },
  {
    href: "/hospitals/consults",
    label: "相談一覧",
    description: "相談継続中の案件や EMS 返信を確認します。",
    Icon: ChatBubbleLeftRightIcon,
  },
  {
    href: "/hp/settings/support",
    label: "support / runbook",
    description: "training demo runbook と role 別設定資料を確認します。",
    Icon: LifebuoyIcon,
  },
] as const;

export default async function HospitalsPage() {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "HOSPITAL" || !user.hospitalId) {
    redirect("/");
  }

  const [operator, data] = await Promise.all([
    getHospitalOperator(),
    user.currentMode === "TRAINING" ? Promise.resolve(null) : getHospitalDashboardData(user.hospitalId, "30d"),
  ]);

  const leadKpis = data ? [...data.backlogKpis, ...data.timingKpis].slice(0, 6) : [];
  const pendingPreview = data?.pendingItems.slice(0, 5) ?? [];

  return (
    <HospitalPortalShell hospitalName={operator.name} hospitalCode={operator.code} currentMode={user.currentMode}>
      <div className="page-frame page-frame--wide w-full min-w-0">
        <div className="page-stack gap-6">
          <DashboardHeroShell
            eyebrow="HOSPITAL RESPONSE DESK"
            title="病院ホーム"
            description={
              <>
                backlog、応答速度、相談後受入の傾向をまとめて確認し、優先案件へすぐ移れるホームです。
                <span className="mx-1 font-semibold text-slate-900">{data?.rangeLabel ?? "TRAINING"}</span>
                を基準にしています。
              </>
            }
            actions={
              <Link
                href="/hospitals/requests"
                className="inline-flex h-10 items-center rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                要請一覧へ
              </Link>
            }
            className="overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#f0fdf4_0%,#f8fafc_44%,#dcfce7_100%)] px-6 py-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] xl:px-7"
            eyebrowClassName="text-[11px] font-semibold tracking-[0.22em] text-emerald-600"
          >
            {user.currentMode === "TRAINING" || !data ? (
              <div className="rounded-[26px] bg-white/92 px-5 py-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.22)]">
                <p className="text-[11px] font-semibold tracking-[0.18em] text-amber-600">TRAINING ANALYTICS</p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">訓練モードでは本番 KPI を表示しません</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">training 受入要請は本番 backlog や応答速度集計に混入させません。訓練中は要請一覧、相談一覧、患者一覧の導線から操作してください。</p>
                <div className="mt-4 rounded-[22px] bg-emerald-50/80 px-4 py-4" data-testid="hospital-home-training-steps">
                  <p className="text-[11px] font-semibold tracking-[0.16em] text-emerald-700">TRAINING STEPS</p>
                  <ol className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                    <li>1. `mode 切替` で TRAINING を維持していることを確認</li>
                    <li>2. `受入要請一覧` で未読と既読未返信を確認</li>
                    <li>3. `相談一覧` と `受入患者一覧` を見て終了後に LIVE へ戻す</li>
                  </ol>
                </div>
                <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
                  <ActionLinkPanel
                    dataTestId="hospital-home-training-routes"
                    kicker="ROUTES"
                    title="訓練導線"
                    badge="training only"
                    items={hospitalNavItems
                      .filter((item) => item.href !== "/hospitals")
                      .map((item) => ({
                        href: item.href,
                        label: item.label,
                        description:
                          item.href === "/hospitals/requests"
                            ? "受入要請の確認と既読/応答"
                            : item.href === "/hospitals/consults"
                              ? "相談案件への返信と確認"
                              : item.href === "/hospitals/patients"
                                ? "搬送患者の一覧確認"
                                : item.href === "/hospitals/declined"
                                  ? "辞退案件の見直し"
                                  : "診療情報の入力と更新",
                        icon: <item.icon className="h-5 w-5" aria-hidden />,
                      }))}
                  />
                  <ActionLinkPanel
                    dataTestId="hospital-home-training-check"
                    kicker="TRAINING CHECK"
                    title="訓練時の確認順"
                    badge="切替 -> backlog -> 終了確認"
                    items={hospitalTrainingLinks.map((item) => ({
                      href: item.href,
                      label: item.label,
                      description: item.description,
                      icon: <item.Icon className="h-5 w-5" aria-hidden />,
                    }))}
                    columnsClassName="sm:grid-cols-1"
                    panelClassName="rounded-[28px] bg-emerald-50/80 px-5 py-5 shadow-[0_20px_44px_-36px_rgba(15,23,42,0.22)]"
                    itemClassName="group rounded-[20px] bg-white/90 px-4 py-3 transition hover:bg-white"
                    itemIconClassName="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"
                  />
                </div>
              </div>
            ) : (
            <KpiBacklogSection
              layoutClassName="xl:grid-cols-[minmax(0,1.28fr)_minmax(330px,0.92fr)]"
              summary={
                <div className="min-w-0">
                  <WatchCallout
                    kicker="BACKLOG WATCH"
                    message={data.backlogKpis[0]?.hint ?? "未対応 backlog を継続監視します。"}
                    description="未読、既読未返信、相談待ちを分けて見ながら、優先案件へ直接介入する前提です。"
                    icon={<ExclamationTriangleIcon className="h-5 w-5" aria-hidden />}
                    iconClassName="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"
                    kickerClassName="text-[11px] font-semibold tracking-[0.18em] text-amber-600"
                    className="rounded-[26px] bg-white/92 px-5 py-4"
                  />
                  <div className="mt-5 grid gap-3 lg:grid-cols-3">
                    {leadKpis.map((item) => (
                      <article key={item.label} className="rounded-[24px] bg-white/88 px-4 py-4">
                        <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400">{item.label}</p>
                        <p className="mt-2 text-[25px] font-bold tracking-[-0.03em] text-slate-950">{item.value}</p>
                        <p className="mt-1 text-[11px] leading-5 text-slate-500">{item.hint ?? "運用状況の継続確認"}</p>
                      </article>
                    ))}
                  </div>
                </div>
              }
              rail={
                <>
                  <PriorityListPanel
                    kicker="PRIORITY CASES"
                    title="優先確認案件"
                    badge={`${pendingPreview.length}件`}
                    items={pendingPreview.map((item) => (
                      <div key={item.id} className="rounded-2xl bg-white/6 px-3.5 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white">{item.title}</p>
                            <p className="mt-1 text-[11px] leading-5 text-slate-300">{item.meta}</p>
                          </div>
                          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-slate-100">
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))}
                    emptyMessage="優先案件はありません。"
                  />
                  <ActionLinkPanel
                    dataTestId="hospital-home-live-primary-routes"
                    kicker="PRIMARY ROUTES"
                    title="対応導線"
                    badge="requests -> consults -> patients"
                    items={hospitalNavItems
                      .filter((item) =>
                        ["/hospitals/requests", "/hospitals/consults", "/hospitals/patients", "/hospitals/declined"].includes(item.href),
                      )
                      .map((item) => ({
                        href: item.href,
                        label: item.label,
                        description:
                          item.href === "/hospitals/requests"
                            ? "未読、既読未返信、priority 要請を最初に確認"
                            : item.href === "/hospitals/consults"
                              ? "相談継続中と EMS 返信の有無を確認"
                              : item.href === "/hospitals/patients"
                                ? "受入後の継続確認と搬送判断を確認"
                                : "辞退案件の見直しと記録確認",
                        icon: <item.icon className="h-5 w-5" aria-hidden />,
                      }))}
                  />
                  <ActionLinkPanel
                    dataTestId="hospital-home-live-support-routes"
                    kicker="SETTINGS / SUPPORT"
                    title="運用補助導線"
                    badge="mode / support"
                    items={[
                      {
                        href: "/hp/settings/mode",
                        label: "運用モード",
                        description: "TRAINING と LIVE の切替、運用ガイド確認",
                        icon: <ArrowPathIcon className="h-5 w-5" aria-hidden />,
                      },
                      {
                        href: "/hp/settings/support",
                        label: "サポート",
                        description: "runbook、FAQ、運用資料の確認",
                        icon: <LifebuoyIcon className="h-5 w-5" aria-hidden />,
                      },
                      {
                        href: "/hospitals/stats",
                        label: "病院統計",
                        description: "科別依頼、相談後受入、応答速度の詳細確認",
                        icon: <BuildingOffice2Icon className="h-5 w-5" aria-hidden />,
                      },
                      {
                        href: "/hp/settings",
                        label: "設定トップ",
                        description: "端末、通知、施設情報、運用設定の入口",
                        icon: <RectangleStackIcon className="h-5 w-5" aria-hidden />,
                      },
                    ]}
                  />
                </>
              }
            />
            )}
          </DashboardHeroShell>

          {data ? (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(320px,0.95fr)]">
            <CompactMetricList
              title="REQUEST MIX"
              description="科目別要請件数"
              items={data.departmentRequests.slice(0, 8)}
              icon={<InboxStackIcon className="h-5 w-5" aria-hidden />}
            />
            <CompactMetricList
              title="ACCEPTABLE MIX"
              description="科目別受入可能件数"
              items={data.departmentAcceptable.slice(0, 8)}
              icon={<ClipboardDocumentCheckIcon className="h-5 w-5" aria-hidden />}
            />
            <MetricPanelFrame
              kicker="TIMING READ"
              title="応答速度の目安"
              icon={<ClockIcon className="h-5 w-5" aria-hidden />}
            >
              <div className="space-y-2.5">
                {data.timingKpis.map((item) => (
                  <div key={item.label} className="rounded-[20px] bg-slate-50/90 px-3.5 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-slate-800">{item.label}</p>
                        <p className="mt-0.5 text-[11px] leading-5 text-slate-500">{item.hint ?? "詳細は統計ページで確認"}</p>
                      </div>
                      <p className="shrink-0 text-sm font-bold tracking-tight text-slate-950">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </MetricPanelFrame>
          </section>
          ) : null}

          {data ? (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <CompactMetricList
              title="RESPONSE PRESSURE"
              description="受入可能件数が多い科目"
              items={data.departmentAcceptable.slice(0, 6)}
              icon={<BuildingOffice2Icon className="h-5 w-5" aria-hidden />}
            />
            <MetricPanelFrame
              kicker="FOLLOW-UP"
              title="次に見る画面"
              icon={<ChatBubbleLeftRightIcon className="h-5 w-5" aria-hidden />}
              iconClassName="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"
            >
              <div className="space-y-2.5">
                <Link href="/hospitals/consults" className="block rounded-[20px] bg-slate-50/90 px-4 py-3 transition hover:bg-slate-100">
                  <p className="text-sm font-semibold text-slate-900">相談一覧</p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">相談待ちや返信待ちを集中確認</p>
                </Link>
                <Link href="/hospitals/requests" className="block rounded-[20px] bg-slate-50/90 px-4 py-3 transition hover:bg-slate-100">
                  <p className="text-sm font-semibold text-slate-900">受入要請一覧</p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">未読と既読未返信の backlog を整理</p>
                </Link>
                <Link href="/hospitals/stats" className="block rounded-[20px] bg-slate-50/90 px-4 py-3 transition hover:bg-slate-100">
                  <p className="text-sm font-semibold text-slate-900">病院統計</p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">科別依頼、相談後受入、応答速度を詳細確認</p>
                </Link>
              </div>
            </MetricPanelFrame>
          </section>
          ) : null}
        </div>
      </div>
    </HospitalPortalShell>
  );
}
