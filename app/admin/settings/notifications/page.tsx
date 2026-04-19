import Link from "next/link";
import { BellAlertIcon, ChartBarIcon, ExclamationTriangleIcon } from "@heroicons/react/24/solid";

import { AdminWorkbenchMetric, AdminWorkbenchSection } from "@/components/admin/AdminWorkbench";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { requireAdminUser } from "@/lib/admin/adminPageAccess";
import { getAdminNotificationSettingsSummary } from "@/lib/admin/adminSettingsRepository";

export default async function AdminNotificationSettingsPage() {
  await requireAdminUser();
  const summary = await getAdminNotificationSettingsSummary();

  return (
    <SettingPageLayout
      tone="admin"
      eyebrow="ADMIN SETTINGS"
      title="通知ポリシー"
      description="通知件数、未読量、失敗 source をまとめて確認する Admin 向けの専用ページです。通知そのものの閲覧ではなく、運用健全性の確認に寄せています。"
      sectionLabel="通知"
      heroNote="通知一覧画面を探さなくても、件数分布と失敗 source をここで先に把握できます。"
    >
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <AdminWorkbenchMetric label="TOTAL" value={summary.totalCount} hint="notifications 総件数" tone="accent" />
        <AdminWorkbenchMetric label="UNREAD" value={summary.unreadCount} hint="未読 notifications" tone={summary.unreadCount > 0 ? "warning" : "accent"} />
        <AdminWorkbenchMetric label="LIVE / TRAINING" value={`${summary.liveCount} / ${summary.trainingCount}`} hint="mode 別の保存件数" />
        <AdminWorkbenchMetric
          label="FAIL 24H"
          value={summary.notificationFailures24h}
          hint="notification_failure イベント"
          tone={summary.notificationFailures24h > 0 ? "warning" : "accent"}
        />
      </section>

      <AdminWorkbenchSection
        kicker="SCOPE"
        title="通知スコープの要約"
        description="EMS / HOSPITAL 向けと個別宛通知の偏りを確認します。"
      >
        <div className="grid gap-4 xl:grid-cols-3">
          <article className="rounded-[24px] border border-slate-200/80 bg-slate-50/70 px-5 py-5">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400">AUDIENCE</p>
            <h2 className="mt-2 text-lg font-bold text-slate-950">ロール別通知</h2>
            <div className="mt-4 rounded-2xl bg-white px-4 py-4 text-sm leading-6 text-slate-600">
              <p>EMS 向け: {summary.emsAudienceCount} 件</p>
              <p>HOSPITAL 向け: {summary.hospitalAudienceCount} 件</p>
              <p>個別ユーザー宛: {summary.targetedCount} 件</p>
            </div>
          </article>
          <article className="rounded-[24px] border border-slate-200/80 bg-slate-50/70 px-5 py-5">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400">TOP KINDS</p>
            <h2 className="mt-2 text-lg font-bold text-slate-950">多い通知種別</h2>
            <div className="mt-4 space-y-2">
              {summary.topKinds.map((item) => (
                <div key={item.kind} className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">{item.kind}</span>
                  <span className="ml-2 text-slate-500">{item.total} 件</span>
                </div>
              ))}
            </div>
          </article>
          <article className="rounded-[24px] border border-slate-200/80 bg-slate-50/70 px-5 py-5">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400">FAIL SOURCES</p>
            <h2 className="mt-2 text-lg font-bold text-slate-950">失敗 source</h2>
            <div className="mt-4 space-y-2">
              {summary.topFailureSources.length === 0 ? (
                <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-500">直近 24 時間の通知失敗はありません。</div>
              ) : (
                summary.topFailureSources.map((item) => (
                  <div key={item.source} className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">
                    <span className="font-semibold text-slate-900">{item.source}</span>
                    <span className="ml-2 text-slate-500">{item.total} 件</span>
                  </div>
                ))
              )}
            </div>
          </article>
        </div>
      </AdminWorkbenchSection>

      <AdminWorkbenchSection
        kicker="NEXT ACTION"
        title="通知運用の次の確認先"
        description="件数や failure を見たあとに、そのまま辿る導線です。"
      >
        <div className="grid gap-4 xl:grid-cols-3">
          <Link
            href="/admin/monitoring"
            className="rounded-[24px] border border-orange-100/80 bg-orange-50/35 px-5 py-5 text-sm font-semibold text-slate-900 transition hover:border-orange-200 hover:bg-orange-50/60"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-orange-100 p-3 text-orange-700">
                <BellAlertIcon className="h-5 w-5" aria-hidden />
              </div>
              <div>
                監視 workbench を開く
                <p className="mt-2 text-xs font-normal leading-5 text-slate-500">notification failure と recent events を同じ視線で確認します。</p>
              </div>
            </div>
          </Link>
          <Link
            href="/admin/settings/support#notifications"
            className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 px-5 py-5 text-sm font-semibold text-slate-900 transition hover:border-orange-200 hover:bg-orange-50/50"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                <ChartBarIcon className="h-5 w-5" aria-hidden />
              </div>
              <div>
                DB hardening / 運用資料を開く
                <p className="mt-2 text-xs font-normal leading-5 text-slate-500">dedupe、index、migration 運用の整理を docs 側で確認します。</p>
              </div>
            </div>
          </Link>
          <article className="rounded-[24px] border border-slate-200/80 bg-white px-5 py-5 text-sm text-slate-700">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                <ExclamationTriangleIcon className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="font-semibold text-slate-900">運用メモ</p>
                <p className="mt-2 leading-6 text-slate-600">未読件数が多いだけでは異常と決めず、notification_failure と top failure source が増えているかを先に見ます。</p>
              </div>
            </div>
          </article>
        </div>
      </AdminWorkbenchSection>
    </SettingPageLayout>
  );
}
