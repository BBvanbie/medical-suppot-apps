export const dynamic = "force-dynamic";

import Link from "next/link";
import { ExclamationTriangleIcon, ServerIcon, ShieldExclamationIcon } from "@heroicons/react/24/solid";

import { AdminWorkbenchMetric, AdminWorkbenchPage, AdminWorkbenchSection } from "@/components/admin/AdminWorkbench";
import { ADMIN_PROBLEM_DRILL_DOWN } from "@/lib/admin/adminProblemDrillDown";
import { requireAdminUser } from "@/lib/admin/adminPageAccess";
import { getAdminMonitoringData } from "@/lib/admin/adminMonitoringRepository";

function toneBadge(status: string) {
  if (status === "error" || status === "failure") return "bg-rose-50 text-rose-700";
  if (status === "warning") return "bg-amber-50 text-amber-700";
  return "bg-emerald-50 text-emerald-700";
}

function formatEventSeverity(severity: "info" | "warning" | "error") {
  if (severity === "error") return "ERROR";
  if (severity === "warning") return "WARN";
  return "INFO";
}

const caseDrillDownItems = [
  {
    href: "/admin/cases?problem=selection_stalled",
    ...ADMIN_PROBLEM_DRILL_DOWN.selection_stalled,
  },
  {
    href: "/admin/cases?problem=consult_stalled",
    ...ADMIN_PROBLEM_DRILL_DOWN.consult_stalled,
  },
  {
    href: "/admin/cases?problem=reply_delay",
    ...ADMIN_PROBLEM_DRILL_DOWN.reply_delay,
  },
] as const;

type MonitoringSignalItem = {
  key: string;
  label: string;
  title: string;
  detail: string;
  statusLabel: string;
  statusTone: string;
  Icon: typeof ServerIcon;
  nextAction: string;
  active: boolean;
  order: number;
};

export default async function AdminMonitoringPage() {
  const user = await requireAdminUser();
  const data = await getAdminMonitoringData();

  const backupStatusLabel =
    data.backup.latestStatus === "success"
      ? "正常"
      : data.backup.latestStatus === "failure"
        ? "失敗あり"
        : "未報告";

  const monitoringSignals: MonitoringSignalItem[] = [
    {
      key: "db",
      label: "DB STATUS",
      title: "DB 接続状態",
      detail: `最終確認: ${data.dbCheckedAt ?? "未確認"}`,
      statusLabel: data.dbStatus === "ok" ? "正常" : "異常",
      statusTone: toneBadge(data.dbStatus),
      Icon: ServerIcon,
      nextAction: data.dbStatus === "ok" ? "接続時刻だけ確認" : "接続ログと fail-safe 状態を確認",
      active: data.dbStatus !== "ok",
      order: 0,
    },
    {
      key: "security",
      label: "SECURITY SIGNALS",
      title: "不正操作兆候",
      detail: `24時間の MFA 失敗、端末登録失敗、権限逸脱試行 ${data.securitySignals24h} 件`,
      statusLabel: data.securitySignals24h > 0 ? "要確認" : "安定",
      statusTone: toneBadge(data.securitySignals24h > 0 ? "warning" : "ok"),
      Icon: ShieldExclamationIcon,
      nextAction: data.securitySignals24h > 0 ? "監査ログと対象 user を確認" : "追加対応なし",
      active: data.securitySignals24h > 0,
      order: 1,
    },
    {
      key: "login-failures",
      label: "LOGIN FAILURES",
      title: "ログイン失敗急増",
      detail: `15分以内の失敗 ${data.loginFailures15m} 件 / ロック中 ${data.lockedUsers} アカウント`,
      statusLabel: data.loginFailures15m > 0 ? "監視中" : "安定",
      statusTone: toneBadge(data.loginFailures15m > 0 ? "warning" : "ok"),
      Icon: ShieldExclamationIcon,
      nextAction: data.loginFailures15m > 0 ? "ロック中 user と発生元を確認" : "失敗推移のみ確認",
      active: data.loginFailures15m > 0,
      order: 2,
    },
    {
      key: "api-failures",
      label: "API FAILURES",
      title: "重要 API 失敗",
      detail: `24時間の失敗 ${data.apiFailures24h} 件 / レート制限 ${data.rateLimitHits1h} 件`,
      statusLabel: data.apiFailures24h > 0 ? "要確認" : "正常",
      statusTone: toneBadge(data.apiFailures24h > 0 ? "warning" : "ok"),
      Icon: ExclamationTriangleIcon,
      nextAction: data.apiFailures24h > 0 ? "失敗 source と recent events を確認" : "失敗 source の偏りだけ確認",
      active: data.apiFailures24h > 0 || data.rateLimitHits1h > 0,
      order: 3,
    },
    {
      key: "notifications",
      label: "NOTIFICATION DELIVERY",
      title: "通知生成 / 配信失敗",
      detail: `24時間の通知失敗 ${data.notificationFailures24h} 件`,
      statusLabel: data.notificationFailures24h > 0 ? "要確認" : "正常",
      statusTone: toneBadge(data.notificationFailures24h > 0 ? "warning" : "ok"),
      Icon: ExclamationTriangleIcon,
      nextAction: data.notificationFailures24h > 0 ? "通知失敗と dedupe 状況を確認" : "追加対応なし",
      active: data.notificationFailures24h > 0,
      order: 4,
    },
    {
      key: "backup",
      label: "BACKUP STATUS",
      title: "バックアップ成否",
      detail: `最新: ${data.backup.latestCompletedAt ?? "未報告"} / 14日失敗 ${data.backup.failureCount14d} 件`,
      statusLabel: backupStatusLabel,
      statusTone: toneBadge(data.backup.latestStatus),
      Icon: ServerIcon,
      nextAction:
        data.backup.latestStatus === "failure" ? "runbook と最新失敗ログを確認" : "最新成功時刻を確認",
      active: data.backup.latestStatus === "failure",
      order: 5,
    },
    {
      key: "app",
      label: "APP HEALTH",
      title: "アプリ生存監視",
      detail: `現在のアプリ稼働時間は ${data.appUptimeLabel} です。`,
      statusLabel: "正常",
      statusTone: toneBadge("ok"),
      Icon: ServerIcon,
      nextAction: "他シグナルで異常がないかだけ確認",
      active: false,
      order: 6,
    },
  ];

  const sortedSignals = [...monitoringSignals].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return a.order - b.order;
  });
  const focusSignals = sortedSignals.filter((item) => item.active).slice(0, 3);

  return (
    <AdminWorkbenchPage
      eyebrow="ADMIN MONITORING"
      title="監視"
      description="アプリ生存、DB接続、ログイン失敗、重要API失敗、通知失敗、バックアップ成否を同じ視線上で確認する監視 workbench です。"
      metrics={
        <>
          <AdminWorkbenchMetric label="APP UPTIME" value={data.appUptimeLabel} hint="現在プロセスの稼働時間" tone="accent" />
          <AdminWorkbenchMetric label="DB STATUS" value={data.dbStatus === "ok" ? "正常" : "異常"} hint={data.dbCheckedAt ? `最終確認 ${data.dbCheckedAt}` : "DB未確認"} tone={data.dbStatus === "ok" ? "accent" : "warning"} />
          <AdminWorkbenchMetric label="LOGIN FAIL 15M" value={data.loginFailures15m} hint={`ロック中 ${data.lockedUsers} 件`} tone={data.loginFailures15m > 0 ? "warning" : "accent"} />
          <AdminWorkbenchMetric label="SECURITY 24H" value={data.securitySignals24h} hint="MFA / 端末 / 権限逸脱兆候" tone={data.securitySignals24h > 0 ? "warning" : "accent"} />
          <AdminWorkbenchMetric label="API FAIL 24H" value={data.apiFailures24h} hint="重要 API の失敗イベント" tone={data.apiFailures24h > 0 ? "warning" : "accent"} />
          <AdminWorkbenchMetric label="NOTIFY FAIL 24H" value={data.notificationFailures24h} hint="通知生成失敗イベント" tone={data.notificationFailures24h > 0 ? "warning" : "accent"} />
          <AdminWorkbenchMetric label="BACKUP" value={backupStatusLabel} hint={`14日失敗 ${data.backup.failureCount14d} / 成功 ${data.backup.successCount14d}`} tone={data.backup.latestStatus === "failure" ? "warning" : "accent"} />
        </>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.9fr)]">
        <AdminWorkbenchSection
          kicker="HEALTH SIGNALS"
          title="監視シグナル"
          description="異常が出ている項目を上段へ寄せています。"
        >
          <div className="grid gap-4 md:grid-cols-2">
            {sortedSignals.map((item, index) => (
              <article
                key={item.key}
                className={`ds-panel-surface rounded-[24px] px-5 py-5 ${item.active ? "border border-orange-200/80 bg-orange-50/35" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400">{item.label}</p>
                      {index < 3 ? (
                        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-slate-500">
                          先に見る順 {index + 1}
                        </span>
                      ) : null}
                    </div>
                    <h2 className="mt-1 text-lg font-bold text-slate-950">{item.title}</h2>
                    <p className="mt-2 text-sm text-slate-600">{item.detail}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={`rounded-2xl p-3 ${item.active ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600"}`}>
                      <item.Icon className="h-6 w-6" aria-hidden />
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.statusTone}`}>{item.statusLabel}</span>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl bg-white/80 px-3 py-3">
                  <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-500">NEXT CHECK</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{item.nextAction}</p>
                </div>
              </article>
            ))}
          </div>
        </AdminWorkbenchSection>

        <div className="space-y-5">
          <AdminWorkbenchSection
            kicker="FOCUS NOW"
            title="先に見る順"
            description="優先確認だけを抜き出します。"
          >
            <div className="space-y-3" data-testid="admin-monitoring-focus-list">
              {focusSignals.length === 0 ? (
                <div className="rounded-[22px] bg-emerald-50/80 px-4 py-4 text-sm text-emerald-900">
                  優先対処が必要な signal はありません。drill-down と recent events を確認してください。
                </div>
              ) : (
                focusSignals.map((item, index) => (
                  <div key={item.key} className="rounded-[22px] border border-orange-200/80 bg-orange-50/60 px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-orange-700">
                        PRIORITY {index + 1}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">{item.title}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{item.detail}</p>
                    <p className="mt-2 text-xs font-semibold tracking-[0.14em] text-slate-500">次 action: {item.nextAction}</p>
                  </div>
                ))
              )}
            </div>
          </AdminWorkbenchSection>

          <AdminWorkbenchSection
            kicker="CASE DRILL-DOWN"
            title="案件滞留から詳細へ入る"
            description="監視で気になった滞留を、filtered case workbench へそのまま渡します。"
          >
            <div className="space-y-3">
              {caseDrillDownItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-[22px] border border-slate-200/80 bg-slate-50/80 px-4 py-4 text-sm font-semibold text-slate-800 transition hover:border-orange-200 hover:bg-orange-50/50"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.chipClassName}`}>{item.label}</span>
                    <span className="text-xs font-medium text-slate-500">一覧 / 詳細 / 次アクション</span>
                  </div>
                  <p className="mt-2 text-xs font-normal leading-5 text-slate-500">{item.monitorDescription}</p>
                </Link>
              ))}
            </div>
          </AdminWorkbenchSection>

          <AdminWorkbenchSection
            kicker="OPERATIONS"
            title="運用導線"
            description="監視結果から次に開くべき管理導線です。"
          >
            <div className="space-y-3">
              <Link href="/admin/users" className="block rounded-[22px] bg-slate-50/80 px-4 py-4 text-sm font-semibold text-slate-800 transition hover:bg-orange-50/60">
                ユーザー管理を開く
                <p className="mt-1 text-xs font-normal text-slate-500">ロック解除、一時PASS発行、所属変更を実行します。</p>
              </Link>
              <Link href="/admin/logs" className="block rounded-[22px] bg-slate-50/80 px-4 py-4 text-sm font-semibold text-slate-800 transition hover:bg-orange-50/60">
                監査ログを開く
                <p className="mt-1 text-xs font-normal text-slate-500">直近の認証変更や端末登録履歴を確認します。</p>
              </Link>
              <div className="rounded-[22px] bg-slate-50/80 px-4 py-4 text-sm font-semibold text-slate-800">
                <Link href="/admin/settings/system" className="inline-flex text-sm font-semibold text-slate-800 hover:text-orange-700">
                  システム設定ページを開く
                </Link>
                <p className="mt-1 text-xs font-normal text-slate-500">DB、バックアップ、runbook の要約を確認してから、Backup / Restore Runbook や Network Security Runbook へ進めます。</p>
              </div>
            </div>
          </AdminWorkbenchSection>

          <AdminWorkbenchSection
            kicker="HOT SOURCES"
            title="失敗元上位"
            description="同じ source に失敗が集中していないかを見ます。"
          >
            <div className="space-y-3">
              {data.topFailureSources.length === 0 ? <p className="text-sm text-slate-500">直近24時間の失敗 source はありません。</p> : null}
              {data.topFailureSources.map((item) => (
                <div key={item.source} className="rounded-[20px] bg-slate-50/80 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">{item.source}</p>
                  <p className="mt-1 text-xs text-slate-500">直近24時間 {item.total} 件</p>
                </div>
              ))}
              {data.topRateLimitSources.length > 0 ? (
                <div className="rounded-[20px] border border-amber-200 bg-amber-50/80 px-4 py-3">
                  <p className="text-xs font-semibold tracking-[0.14em] text-amber-700">RATE LIMIT HOTSPOTS</p>
                  <div className="mt-2 space-y-2">
                    {data.topRateLimitSources.map((item) => (
                      <p key={item.source} className="text-sm text-amber-900">
                        {item.source}: {item.total} 件
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
              {data.topSecuritySignalSources.length > 0 ? (
                <div className="rounded-[20px] border border-rose-200 bg-rose-50/80 px-4 py-3">
                  <p className="text-xs font-semibold tracking-[0.14em] text-rose-700">SECURITY SIGNAL HOTSPOTS</p>
                  <div className="mt-2 space-y-2">
                    {data.topSecuritySignalSources.map((item) => (
                      <p key={item.source} className="text-sm text-rose-900">
                        {item.source}: {item.total} 件
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </AdminWorkbenchSection>
        </div>
      </div>

      <AdminWorkbenchSection
        kicker="RECENT EVENTS"
        title="直近監視イベント"
        description={`生成時刻 ${data.generatedAt}。監視イベントの直近12件です。${user.currentMode === "TRAINING" ? "TRAINING でも全体監視イベントは確認対象です。" : ""}`}
      >
        <div className="space-y-3">
          {data.recentEvents.length === 0 ? <p className="text-sm text-slate-500">監視イベントはまだ記録されていません。</p> : null}
          {data.recentEvents.map((event) => (
            <article key={event.id} className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${toneBadge(event.severity)}`}>{formatEventSeverity(event.severity)}</span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">{event.category}</span>
                    <p className="text-xs text-slate-500">{event.source}</p>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{event.message}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  {event.severity === "error" ? <ExclamationTriangleIcon className="h-4 w-4 text-rose-600" aria-hidden /> : <ShieldExclamationIcon className="h-4 w-4 text-amber-600" aria-hidden />}
                  {event.createdAt}
                </div>
              </div>
            </article>
          ))}
        </div>
      </AdminWorkbenchSection>
    </AdminWorkbenchPage>
  );
}
