export const dynamic = "force-dynamic";

import Link from "next/link";
import { ExclamationTriangleIcon, ServerIcon, ShieldExclamationIcon } from "@heroicons/react/24/solid";

import { AdminWorkbenchMetric, AdminWorkbenchPage, AdminWorkbenchSection } from "@/components/admin/AdminWorkbench";
import { getAuthenticatedUser } from "@/lib/authContext";
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

export default async function AdminMonitoringPage() {
  const user = await getAuthenticatedUser();
  const data = await getAdminMonitoringData();

  const backupStatusLabel =
    data.backup.latestStatus === "success"
      ? "正常"
      : data.backup.latestStatus === "failure"
        ? "失敗あり"
        : "未報告";

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
          description="まず見るべき6項目を、現在値と対処導線付きでまとめています。"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <article className="ds-panel-surface rounded-[24px] px-5 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400">APP HEALTH</p>
                  <h2 className="mt-1 text-lg font-bold text-slate-950">アプリ生存監視</h2>
                  <p className="mt-2 text-sm text-slate-600">現在のアプリ稼働時間は {data.appUptimeLabel} です。</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                  <ServerIcon className="h-6 w-6" aria-hidden />
                </div>
              </div>
            </article>

            <article className="ds-panel-surface rounded-[24px] px-5 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400">DB STATUS</p>
                  <h2 className="mt-1 text-lg font-bold text-slate-950">DB 接続状態</h2>
                  <p className="mt-2 text-sm text-slate-600">最終確認: {data.dbCheckedAt ?? "未確認"}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneBadge(data.dbStatus)}`}>
                  {data.dbStatus === "ok" ? "正常" : "異常"}
                </span>
              </div>
            </article>

            <article className="ds-panel-surface rounded-[24px] px-5 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400">LOGIN FAILURES</p>
                  <h2 className="mt-1 text-lg font-bold text-slate-950">ログイン失敗急増</h2>
                  <p className="mt-2 text-sm text-slate-600">15分以内の失敗 {data.loginFailures15m} 件 / ロック中 {data.lockedUsers} アカウント</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneBadge(data.loginFailures15m > 0 ? "warning" : "ok")}`}>
                  {data.loginFailures15m > 0 ? "監視中" : "安定"}
                </span>
              </div>
            </article>

            <article className="ds-panel-surface rounded-[24px] px-5 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400">API FAILURES</p>
                  <h2 className="mt-1 text-lg font-bold text-slate-950">重要 API 失敗</h2>
                  <p className="mt-2 text-sm text-slate-600">24時間の失敗 {data.apiFailures24h} 件 / レート制限 {data.rateLimitHits1h} 件</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneBadge(data.apiFailures24h > 0 ? "warning" : "ok")}`}>
                  {data.apiFailures24h > 0 ? "要確認" : "正常"}
                </span>
              </div>
            </article>

            <article className="ds-panel-surface rounded-[24px] px-5 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400">SECURITY SIGNALS</p>
                  <h2 className="mt-1 text-lg font-bold text-slate-950">不正操作兆候</h2>
                  <p className="mt-2 text-sm text-slate-600">24時間の MFA 失敗、端末登録失敗、権限逸脱試行 {data.securitySignals24h} 件</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneBadge(data.securitySignals24h > 0 ? "warning" : "ok")}`}>
                  {data.securitySignals24h > 0 ? "要確認" : "安定"}
                </span>
              </div>
            </article>

            <article className="ds-panel-surface rounded-[24px] px-5 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400">NOTIFICATION DELIVERY</p>
                  <h2 className="mt-1 text-lg font-bold text-slate-950">通知生成 / 配信失敗</h2>
                  <p className="mt-2 text-sm text-slate-600">24時間の通知失敗 {data.notificationFailures24h} 件</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneBadge(data.notificationFailures24h > 0 ? "warning" : "ok")}`}>
                  {data.notificationFailures24h > 0 ? "要確認" : "正常"}
                </span>
              </div>
            </article>

            <article className="ds-panel-surface rounded-[24px] px-5 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400">BACKUP STATUS</p>
                  <h2 className="mt-1 text-lg font-bold text-slate-950">バックアップ成否</h2>
                  <p className="mt-2 text-sm text-slate-600">最新: {data.backup.latestCompletedAt ?? "未報告"} / 14日失敗 {data.backup.failureCount14d} 件</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneBadge(data.backup.latestStatus)}`}>
                  {backupStatusLabel}
                </span>
              </div>
            </article>
          </div>
        </AdminWorkbenchSection>

        <div className="space-y-5">
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
                Backup / Restore Runbook
                <p className="mt-1 text-xs font-normal text-slate-500">`docs/operations/backup-restore-runbook.md` に 12:00 / 24:00 実施、14日保持、RPO 12時間 / RTO 4時間の手順を整理しています。</p>
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
        description={`生成時刻 ${data.generatedAt}。監視イベントの直近12件です。${user?.currentMode === "TRAINING" ? "TRAINING でも全体監視イベントは確認対象です。" : ""}`}
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
