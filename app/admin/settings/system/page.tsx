import Link from "next/link";
import { ArrowTopRightOnSquareIcon, ClipboardDocumentCheckIcon, ServerStackIcon, ShieldExclamationIcon } from "@heroicons/react/24/solid";

import { AdminWorkbenchMetric, AdminWorkbenchSection } from "@/components/admin/AdminWorkbench";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { getAdminComplianceDashboardSummary } from "@/lib/admin/adminComplianceRepository";
import { requireAdminUser } from "@/lib/admin/adminPageAccess";
import { getAdminSystemSettingsSummary } from "@/lib/admin/adminSettingsRepository";

function toneChip(isAlert: boolean) {
  return isAlert ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700";
}

export default async function AdminSystemSettingsPage() {
  await requireAdminUser();
  const [data, compliance] = await Promise.all([getAdminSystemSettingsSummary(), getAdminComplianceDashboardSummary()]);

  const backupStatusLabel =
    data.backup.latestStatus === "success"
      ? "正常"
      : data.backup.latestStatus === "failure"
        ? "失敗あり"
        : "未報告";

  return (
    <SettingPageLayout
      tone="admin"
      eyebrow="ADMIN SETTINGS"
      title="システム設定"
      description="システム監視、バックアップ、runbook をまとめて確認する Admin 向けの専用ページです。編集より先に、現在状態の把握と次の確認先を近接配置しています。"
      sectionLabel="システム"
      heroNote="監視画面へ飛ぶ前に、DB 状態、直近失敗、バックアップ成否をこのページで先に確認できます。"
    >
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <AdminWorkbenchMetric
          label="DB STATUS"
          value={data.dbStatus === "ok" ? "正常" : "異常"}
          hint={data.dbCheckedAt ? `最終確認 ${data.dbCheckedAt}` : "DB未確認"}
          tone={data.dbStatus === "ok" ? "accent" : "warning"}
        />
        <AdminWorkbenchMetric
          label="BACKUP"
          value={backupStatusLabel}
          hint={`14日 成功 ${data.backup.successCount14d} / 失敗 ${data.backup.failureCount14d}`}
          tone={data.backup.latestStatus === "failure" ? "warning" : "accent"}
        />
        <AdminWorkbenchMetric
          label="API FAIL 24H"
          value={data.apiFailures24h}
          hint="重要 API の失敗イベント"
          tone={data.apiFailures24h > 0 ? "warning" : "accent"}
        />
        <AdminWorkbenchMetric
          label="COMPLIANCE"
          value={compliance.attentionCount}
          hint={`未記録 ${compliance.missingCount} / 期限超過 ${compliance.overdueCount}`}
          tone={compliance.attentionCount > 0 ? "warning" : "accent"}
        />
      </section>

      <AdminWorkbenchSection
        kicker="SYSTEM HEALTH"
        title="いま見るべきシステム状態"
        description="system 系の判断材料を、監視 workbench を開く前に要約しています。"
      >
        <div className="grid gap-4 xl:grid-cols-4">
          <article className="rounded-[24px] border border-slate-200/80 bg-slate-50/70 px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400">DB</p>
                <h2 className="mt-2 text-lg font-bold text-slate-950">接続状態</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">DB 接続確認、API failure、security signal をまとめて監視します。</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneChip(data.dbStatus !== "ok" || data.apiFailures24h > 0)}`}>
                {data.dbStatus === "ok" ? "正常" : "要確認"}
              </span>
            </div>
            <div className="mt-4 rounded-2xl bg-white px-4 py-4 text-sm leading-6 text-slate-600">
              <p>最終 DB 確認: {data.dbCheckedAt ?? "未確認"}</p>
              <p>API 失敗 24h: {data.apiFailures24h} 件</p>
              <p>アプリ稼働: {data.appUptimeLabel}</p>
            </div>
          </article>

          <article className="rounded-[24px] border border-slate-200/80 bg-slate-50/70 px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400">BACKUP</p>
                <h2 className="mt-2 text-lg font-bold text-slate-950">バックアップ状態</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">最新成否と 14 日の成功 / 失敗回数をこの場で確認します。</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneChip(data.backup.latestStatus === "failure")}`}>
                {backupStatusLabel}
              </span>
            </div>
            <div className="mt-4 rounded-2xl bg-white px-4 py-4 text-sm leading-6 text-slate-600">
              <p>最新完了: {data.backup.latestCompletedAt ?? "未報告"}</p>
              <p>成功 14日: {data.backup.successCount14d} 件</p>
              <p>失敗 14日: {data.backup.failureCount14d} 件</p>
            </div>
          </article>

          <article className="rounded-[24px] border border-slate-200/80 bg-slate-50/70 px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400">SECURITY</p>
                <h2 className="mt-2 text-lg font-bold text-slate-950">運用上の注意</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">ログイン失敗、ロック中ユーザー、不正操作兆候を先に見ます。</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneChip(data.securitySignals24h > 0 || data.loginFailures15m > 0)}`}>
                {data.securitySignals24h > 0 || data.loginFailures15m > 0 ? "監視中" : "安定"}
              </span>
            </div>
            <div className="mt-4 rounded-2xl bg-white px-4 py-4 text-sm leading-6 text-slate-600">
                <p>security signal 24h: {data.securitySignals24h} 件</p>
                <p>login failure 15m: {data.loginFailures15m} 件</p>
                <p>lock 中 user: {data.lockedUsers} 件</p>
              </div>
          </article>

          <article className="rounded-[24px] border border-slate-200/80 bg-slate-50/70 px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400">COMPLIANCE</p>
                <h2 className="mt-2 text-lg font-bold text-slate-950">ガイドライン運用記録</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">棚卸、監査、restore drill、教育、委託見直しの記録と期限超過を確認します。</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneChip(compliance.attentionCount > 0)}`}>
                {compliance.attentionCount > 0 ? "要確認" : "安定"}
              </span>
            </div>
            <div className="mt-4 rounded-2xl bg-white px-4 py-4 text-sm leading-6 text-slate-600">
              <p>要確認: {compliance.attentionCount} 件</p>
              <p>未記録: {compliance.missingCount} 件</p>
              <p>期限超過: {compliance.overdueCount} 件</p>
              <p>直近実施: {compliance.latestCompletedAt ?? "未記録"}</p>
            </div>
          </article>
        </div>
      </AdminWorkbenchSection>

      <AdminWorkbenchSection
        kicker="NEXT ACTION"
        title="次に開く導線"
        description="system 系で判断したあとに、そのまま入る画面と runbook です。"
      >
        <div className="grid gap-4 xl:grid-cols-4">
          <Link
            href="/admin/monitoring"
            className="rounded-[24px] border border-orange-100/80 bg-orange-50/35 px-5 py-5 text-sm font-semibold text-slate-900 transition hover:border-orange-200 hover:bg-orange-50/60"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-orange-100 p-3 text-orange-700">
                <ServerStackIcon className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                監視 workbench を開く
                <p className="mt-2 text-xs font-normal leading-5 text-slate-500">recent events、失敗 source、case drill-down を同じ画面で確認します。</p>
              </div>
            </div>
          </Link>
          <Link
            href="/admin/settings/security"
            className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 px-5 py-5 text-sm font-semibold text-slate-900 transition hover:border-orange-200 hover:bg-orange-50/50"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                <ShieldExclamationIcon className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                認証 / 端末運用資料を開く
                <p className="mt-2 text-xs font-normal leading-5 text-slate-500">紛失時再開、端末登録、HOSPITAL MFA の運用を確認します。</p>
              </div>
            </div>
          </Link>
          <Link
            href="/admin/settings/compliance"
            className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 px-5 py-5 text-sm font-semibold text-slate-900 transition hover:border-orange-200 hover:bg-orange-50/50"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                <ClipboardDocumentCheckIcon className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                ガイドライン運用記録を開く
                <p className="mt-2 text-xs font-normal leading-5 text-slate-500">未記録、期限超過、要フォローアップをこの場から是正します。</p>
              </div>
            </div>
          </Link>
          <Link
            href="/admin/settings/support#system"
            className="rounded-[24px] border border-slate-200/80 bg-white px-5 py-5 text-sm font-semibold text-slate-900 transition hover:border-orange-200 hover:bg-orange-50/40"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                <ArrowTopRightOnSquareIcon className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                runbook 一覧を開く
                <p className="mt-2 text-xs font-normal leading-5 text-slate-500">Backup / Restore、Network Security など docs 原本を確認します。</p>
              </div>
            </div>
          </Link>
        </div>
      </AdminWorkbenchSection>
    </SettingPageLayout>
  );
}
