"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
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
import { EmsMciIncidentPanel } from "@/components/ems/EmsMciIncidentPanel";
import { ActionLinkPanel } from "@/components/shared/ActionLinkPanel";
import { DashboardHeroShell } from "@/components/shared/DashboardHeroShell";
import { KpiBacklogSection } from "@/components/shared/KpiBacklogSection";
import { KpiPanel } from "@/components/shared/KpiPanel";
import { MetricPanelFrame } from "@/components/shared/MetricPanelFrame";
import { UserModeBadge } from "@/components/shared/UserModeBadge";
import {
  getEmsOperationalModeDescription,
  getEmsOperationalModeShortLabel,
} from "@/lib/emsOperationalMode";
import type { DistributionItem, EmsDashboardData } from "@/lib/dashboardAnalytics";
import type { AppMode } from "@/lib/appMode";
import type { EmsOperationalMode } from "@/lib/emsSettingsValidation";

type HomeDashboardProps = {
  operatorName: string;
  operatorCode: string;
  currentMode: AppMode;
  operationalMode: EmsOperationalMode;
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
      className="ds-radius-panel-lg bg-white px-4 py-4 ds-shadow-card-soft"
      headerClassName="mb-3 flex items-start justify-between gap-3"
      kickerClassName="ds-text-2xs font-semibold ds-track-eyebrow-wide text-slate-400"
      titleClassName="mt-1 text-base font-bold tracking-tight text-slate-900"
      iconClassName="mt-0.5 flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"
    >
      <div className="space-y-2.5">
        {items.length === 0 ? <p className="text-sm text-slate-500">データがありません。</p> : null}
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate ds-text-sm-compact font-semibold text-slate-800">{item.label}</p>
                {item.secondaryValue != null ? (
                  <p className="mt-0.5 ds-text-xs-compact text-slate-500">
                    {item.secondaryLabel ?? "補助"} {item.secondaryValue}
                    {valueSuffix}
                  </p>
                ) : null}
              </div>
              <p className="shrink-0 ds-text-xs-compact font-semibold text-slate-500">
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

export function HomeDashboard({ operatorName, operatorCode, currentMode, operationalMode: initialOperationalMode, data }: HomeDashboardProps) {
  const [operationalMode, setOperationalMode] = useState<EmsOperationalMode>(initialOperationalMode);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isTriage = operationalMode === "TRIAGE";
  const leadKpis = data?.kpis.slice(0, 4) ?? [];
  const supportKpis = data?.kpis.slice(4) ?? [];
  const prioritizedQuickLinks = useMemo(() => {
    if (operationalMode !== "TRIAGE") return quickLinks;
    return [quickLinks[0], quickLinks[1], quickLinks[2], quickLinks[5], quickLinks[4]];
  }, [operationalMode]);

  const saveOperationalMode = (nextMode: EmsOperationalMode) => {
    if (nextMode === operationalMode || isPending) return;
    const previousMode = operationalMode;
    setOperationalMode(nextMode);
    setStatusMessage(nextMode === "TRIAGE" ? "トリアージモードへ切り替え中です。" : "通常運用へ切り替え中です。");

    startTransition(async () => {
      try {
        const res = await fetch("/api/settings/ambulance/operational-mode", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operationalMode: nextMode }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { message?: string };
          setOperationalMode(previousMode);
          setStatusMessage(data.message ?? "トリアージモードの切替に失敗しました。");
          return;
        }

        setStatusMessage(nextMode === "TRIAGE" ? "トリアージモードで表示しています。" : "通常運用で表示しています。");
      } catch {
        setOperationalMode(previousMode);
        setStatusMessage("通信に失敗しました。");
      }
    });
  };

  return (
    <EmsPortalShell operatorName={operatorName} operatorCode={operatorCode} currentMode={currentMode} operationalMode={operationalMode}>
      <div className="page-frame page-frame--wide w-full min-w-0">
        <div className="page-stack gap-5">
          <DashboardHeroShell
            eyebrow={isTriage ? "TRIAGE COMMAND DESK" : "EMS COMMAND DESK"}
            title={isTriage ? "災害初動デスク" : "救急隊ホーム"}
            description={
              <>
                {isTriage
                  ? "大規模災害時の初動導線を優先し、各隊の状況報告を本部へ集約するためのホームです。病院連絡と搬送先振り分けは dispatch 側で行います。"
                  : "自隊の現況、進行事案、病院選定、設定確認を短時間で切り替える現場指揮卓です。"}
                <span className="mx-1 font-semibold text-slate-900">{data?.rangeLabel ?? "TRAINING"}</span>
                を基準にしています。
              </>
            }
            actions={
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <div
                  data-testid="ems-home-operational-toggle"
                  className={`inline-flex rounded-full border p-1 ds-shadow-toggle-soft ${
                    isTriage ? "border-rose-200 bg-rose-50" : "border-blue-100 bg-white/90"
                  }`}
                >
                  {(["STANDARD", "TRIAGE"] as const).map((mode) => {
                    const selected = mode === operationalMode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => saveOperationalMode(mode)}
                        disabled={isPending}
                        className={[
                          "inline-flex h-9 items-center rounded-full px-3 ds-text-xs-compact font-semibold ds-track-label transition",
                          selected
                            ? isTriage
                              ? "bg-rose-500 text-white"
                              : "bg-slate-950 text-white"
                            : isTriage
                              ? "text-rose-700 hover:bg-white hover:text-rose-800"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                        ].join(" ")}
                      >
                        {getEmsOperationalModeShortLabel(mode)}
                      </button>
                    );
                  })}
                </div>
                <span className={`rounded-full px-3 py-1 ds-text-2xs font-semibold ds-track-section ${isTriage ? "bg-rose-50 text-rose-700" : "bg-white/90 text-slate-600"}`}>
                  tablet landscape
                </span>
                <Link
                  href={isTriage ? "/cases/new" : "/hospitals/search"}
                  className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold text-white transition ${
                    isTriage ? "bg-rose-500 hover:bg-rose-400" : "bg-slate-950 hover:bg-slate-800"
                  }`}
                >
                  {isTriage ? "本部報告へ" : "病院検索へ"}
                </Link>
              </div>
            }
            className={`overflow-hidden ds-radius-display px-5 py-5 xl:px-6 ${
              isTriage
                ? "border border-rose-200/80 bg-white ds-shadow-emergency"
                : "border border-blue-100/80 bg-white ds-shadow-primary-hero"
            }`}
            eyebrowClassName={`ds-text-2xs font-semibold ds-track-hero ${isTriage ? "text-rose-700" : "text-blue-500"}`}
            titleClassName="mt-2 ds-text-display font-bold ds-track-display text-slate-950"
            descriptionClassName={`mt-2 max-w-3xl text-sm leading-6 ${isTriage ? "text-rose-900" : "text-slate-600"}`}
            bodyClassName="mt-5"
          >
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span
                data-testid="ems-home-operational-badge"
                className={`rounded-full px-3 py-1 ds-text-2xs font-semibold ds-track-eyebrow ${
                  isTriage ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-700"
                }`}
              >
                {getEmsOperationalModeShortLabel(operationalMode)}
              </span>
              <span className={`text-xs ${isTriage ? "text-rose-900" : "text-slate-600"}`}>{getEmsOperationalModeDescription(operationalMode)}</span>
              {statusMessage ? <span className={`text-xs font-medium ${isTriage ? "text-rose-700" : "text-slate-500"}`}>{statusMessage}</span> : null}
            </div>
            {currentMode === "TRAINING" || !data ? (
              <div className={`ds-radius-panel p-5 ds-shadow-card-soft ${isTriage ? "border border-rose-100 bg-rose-50" : "bg-white/92"}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="ds-text-xs-compact font-semibold ds-track-eyebrow-wide text-amber-600">TRAINING ANALYTICS</p>
                    <h2 className="mt-1 text-lg font-bold text-slate-900">訓練モードでは本番集計を表示しません</h2>
                    <p className={`mt-1 text-sm leading-6 ${isTriage ? "text-rose-900" : "text-slate-600"}`}>training 事案は本番 KPI に混入させない方針のため、統計は空表示です。訓練フローの確認は作成、送信、相談、搬送決定の導線から行ってください。</p>
                  </div>
                  <UserModeBadge mode={currentMode} />
                </div>
                <div className="mt-5">
                  <ActionLinkPanel
                    kicker="FAST ACTIONS"
                    title={operationalMode === "TRIAGE" ? "訓練時の優先導線" : "訓練導線"}
                    badge="training only"
                    dataTestId="ems-home-priority-links"
                    items={prioritizedQuickLinks.map((item) => ({
                      href: item.href,
                      label: item.label,
                      description: item.description,
                      icon: <item.Icon className="h-5 w-5" aria-hidden />,
                    }))}
                    columnsClassName=""
                    panelClassName={`ds-radius-command px-4 py-4 ${isTriage ? "bg-white" : "bg-slate-50/95"}`}
                    itemClassName={`ds-radius-callout px-4 py-4 transition ${isTriage ? "border border-rose-100 bg-rose-50 hover:bg-rose-100" : "bg-white hover:bg-slate-50"}`}
                    itemIconClassName={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${isTriage ? "bg-rose-500/18 text-rose-100" : "bg-blue-50 text-blue-700"}`}
                    kickerClassName={isTriage ? "ds-text-xs-compact font-semibold ds-track-eyebrow-wide text-rose-700" : undefined}
                    titleClassName={isTriage ? "mt-1 text-lg font-bold tracking-tight text-slate-900" : undefined}
                    badgeClassName={isTriage ? "rounded-full bg-rose-50 px-3 py-1 ds-text-xs-compact font-semibold text-rose-700" : undefined}
                    itemLabelClassName={isTriage ? "text-sm font-semibold text-slate-900" : undefined}
                    itemDescriptionClassName={isTriage ? "mt-1 ds-text-xs-compact leading-5 text-rose-900" : undefined}
                  />
                </div>
              </div>
            ) : (
            <KpiBacklogSection
                layoutClassName="ds-grid-xl-home-main"
                summary={
                  <div className="grid gap-4 xl:grid-cols-2">
                    <CompactBars
                      title="INCIDENT MIX"
                      description={operationalMode === "TRIAGE" ? "種別ごとの出場件数参考" : "種別ごとの出場件数"}
                      items={data.incidentCounts.slice(0, 6)}
                      icon={<ArrowTrendingUpIcon className="h-4.5 w-4.5" aria-hidden />}
                    />
                    <CompactBars
                      title="TRANSPORT RESULT"
                      description={operationalMode === "TRIAGE" ? "搬送 / 不搬送割合参考" : "搬送 / 不搬送割合"}
                      items={data.transportByIncident.slice(0, 6)}
                      icon={<ClockIcon className="h-4.5 w-4.5" aria-hidden />}
                    />

                    <KpiPanel
                      kicker={operationalMode === "TRIAGE" ? "SUPPORT KPIS" : "AVERAGE TIME KPI"}
                      title={operationalMode === "TRIAGE" ? "補助情報" : "平均時間KPI"}
                      badge={
                        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                          <ClockIcon className="h-4.5 w-4.5" aria-hidden />
                        </div>
                      }
                      className="ds-shadow-card-soft"
                    >
                      <div className="grid gap-3 sm:grid-cols-2">
                        {leadKpis.map((item) => (
                          <article key={item.label} className="ds-radius-callout bg-slate-50/90 px-4 py-4">
                            <p className="ds-text-2xs font-semibold ds-track-eyebrow text-slate-400">{item.label}</p>
                            <p className="mt-2 ds-text-title-step font-bold ds-track-display text-slate-950">{item.value}</p>
                            <p className="mt-1 ds-text-xs-compact leading-5 text-slate-500">{item.hint ?? "直近傾向として継続確認"}</p>
                          </article>
                        ))}
                      </div>
                    </KpiPanel>

                    <KpiPanel
                      kicker={operationalMode === "TRIAGE" ? "FOLLOW-UP" : "QUICK READ"}
                      title={operationalMode === "TRIAGE" ? "後続確認" : "補助指標"}
                      badge={
                        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                          <ChartBarIcon className="h-4.5 w-4.5" aria-hidden />
                        </div>
                      }
                      className="ds-shadow-card-soft"
                    >
                      <div className="space-y-3">
                        {supportKpis.map((item) => (
                          <div key={item.label} className="ds-radius-callout bg-slate-50/90 px-4 py-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="ds-text-xs-plus font-semibold leading-5 text-slate-800">{item.label}</p>
                                <p className="mt-0.5 ds-text-xs-compact leading-5 text-slate-500">{item.hint ?? "統計ページで詳細確認"}</p>
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
                    title={isTriage ? "初動導線" : "現場導線"}
                    badge={isTriage ? "triage priority" : "すぐ移動"}
                    dataTestId="ems-home-priority-links"
                    items={prioritizedQuickLinks.map((item) => ({
                      href: item.href,
                      label: item.label,
                      description: item.description,
                      icon: <item.Icon className="h-5 w-5" aria-hidden />,
                    }))}
                    columnsClassName=""
                    panelClassName={`ds-radius-panel-lg px-5 py-4 ds-shadow-card-soft ${
                      isTriage ? "border border-rose-200 bg-white" : "bg-white/92"
                    }`}
                    itemClassName={`ds-radius-section px-4 py-4 transition ${isTriage ? "border border-rose-100 bg-rose-50 hover:bg-rose-100" : "bg-slate-50/95 hover:bg-white"}`}
                    itemIconClassName={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${isTriage ? "bg-rose-500/20 text-rose-100" : "bg-white text-blue-700"}`}
                    kickerClassName={isTriage ? "ds-text-xs-compact font-semibold ds-track-eyebrow-wide text-rose-700" : undefined}
                    titleClassName={isTriage ? "mt-1 text-lg font-bold tracking-tight text-slate-900" : undefined}
                    badgeClassName={isTriage ? "rounded-full bg-rose-50 px-3 py-1 ds-text-xs-compact font-semibold text-rose-700" : undefined}
                    itemLabelClassName={isTriage ? "text-sm font-semibold text-slate-900" : undefined}
                    itemDescriptionClassName={isTriage ? "mt-1 ds-text-xs-compact leading-5 text-rose-900" : undefined}
                  />
                }
              />
            )}
          </DashboardHeroShell>
          <EmsMciIncidentPanel />
        </div>
      </div>
    </EmsPortalShell>
  );
}
