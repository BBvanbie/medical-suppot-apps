import Link from "next/link";
import { ArrowTopRightOnSquareIcon, ClipboardDocumentCheckIcon, ShieldExclamationIcon } from "@heroicons/react/24/solid";

import { AdminWorkbenchMetric, AdminWorkbenchSection } from "@/components/admin/AdminWorkbench";
import { AdminComplianceRegistryPanel } from "@/components/admin/AdminComplianceRegistryPanel";
import { AdminComplianceOperatingUnitManager } from "@/components/admin/AdminComplianceOperatingUnitManager";
import { AdminComplianceRunForm } from "@/components/admin/AdminComplianceRunForm";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { getAdminComplianceDashboardSummary } from "@/lib/admin/adminComplianceRepository";
import { requireAdminUser } from "@/lib/admin/adminPageAccess";

function toneChip(state: "missing" | "overdue" | "followup" | "ok") {
  if (state === "overdue" || state === "followup") return "bg-amber-50 text-amber-700";
  if (state === "missing") return "bg-slate-100 text-slate-700";
  return "bg-emerald-50 text-emerald-700";
}

export default async function AdminComplianceSettingsPage() {
  await requireAdminUser();
  const data = await getAdminComplianceDashboardSummary();
  const organizationLabelMap = new Map(
    data.organizationOptions.map((item) => [`${item.scope}:${item.organizationId}`, item.label] as const),
  );

  return (
    <SettingPageLayout
      tone="admin"
      eyebrow="ADMIN SETTINGS"
      title="ガイドライン運用記録"
      description="ID 棚卸、監査レビュー、restore drill、教育、委託見直し、ネットワーク見直しの実施記録を残す Admin 向けページです。導入先固有データが未確定でも、運用証跡の期限管理をシステム内で持てます。"
      sectionLabel="compliance"
      heroNote="ガイドライン準拠の技術基盤として、実施記録、次回期限、要フォローアップをここで一元管理します。"
    >
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <AdminWorkbenchMetric label="OPERATIONS" value={data.totalOperations} hint="固定管理対象" tone="accent" />
        <AdminWorkbenchMetric label="RECORDED" value={data.recordedOperations} hint="記録済み運用" tone={data.recordedOperations < data.totalOperations ? "warning" : "accent"} />
        <AdminWorkbenchMetric label="ATTENTION" value={data.attentionCount} hint={`未記録 ${data.missingCount} / 期限超過 ${data.overdueCount}`} tone={data.attentionCount > 0 ? "warning" : "accent"} />
        <AdminWorkbenchMetric label="FOLLOW-UP" value={data.followupCount} hint="要フォローアップ" tone={data.followupCount > 0 ? "warning" : "accent"} />
        <AdminWorkbenchMetric label="LATEST RUN" value={data.latestCompletedAt ?? "-"} hint="直近実施" tone="accent" />
      </section>

      <div className="grid gap-5 ds-grid-xl-compliance-main">
        <AdminWorkbenchSection
          kicker="OPERATION STATUS"
          title="運用別の最新状態"
          description="runbook 単位で最新記録、次回期限、注意状態を確認できます。"
        >
          <div className="grid gap-4 md:grid-cols-2">
            {data.operations.map((item) => (
              <article key={item.key} className="ds-radius-panel border border-slate-200/80 bg-slate-50/70 px-5 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="ds-text-xs-compact font-semibold ds-track-eyebrow text-slate-400">{item.cadenceLabel}</p>
                    <h2 className="mt-2 text-lg font-bold text-slate-950">{item.label}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.summary}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneChip(item.attentionState)}`}>
                    {item.attentionLabel}
                  </span>
                </div>
                <div className="mt-4 rounded-2xl bg-white px-4 py-4 text-sm leading-6 text-slate-600">
                  <p>最新実施: {item.latestRun?.completedAt ?? "未記録"}</p>
                  <p>次回期限: {item.latestRun?.nextDueAt ?? "未設定"}</p>
                  <p>結果: {item.latestRun?.status === "needs_followup" ? "要フォローアップ" : item.latestRun ? "完了" : "-"}</p>
                  <p>証跡: {item.latestRun?.evidenceLocation || "-"}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={item.runbookHref}
                    className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-orange-50 hover:text-orange-700"
                  >
                    runbook
                    <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </AdminWorkbenchSection>

        <div className="space-y-5">
          <AdminWorkbenchSection
            kicker="ADD RECORD"
            title="実施記録を追加"
            description="導入先固有の正式台帳が未確定でも、実施記録と次回期限だけは先にシステムへ残せます。"
          >
            <AdminComplianceRunForm
              recentRuns={data.recentRuns.map((item) => ({
                id: item.id,
                operationLabel: item.operationLabel,
                completedAt: item.completedAt,
              }))}
              organizationOptions={data.organizationOptions}
            />
          </AdminWorkbenchSection>

          <AdminWorkbenchSection
            kicker="OPERATING UNITS"
            title="運用主体を管理"
            description="admin / shared の運用主体を追加・無効化し、registry 候補へ同期します。"
          >
            <AdminComplianceOperatingUnitManager operatingUnits={data.operatingUnits} />
          </AdminWorkbenchSection>

          <AdminWorkbenchSection
            kicker="REGISTRY"
            title="registry の現在値"
            description="病院、EMS、運用主体の active 候補を scope ごとに確認します。"
          >
            <AdminComplianceRegistryPanel entries={data.registryEntries} />
          </AdminWorkbenchSection>

          <AdminWorkbenchSection
            kicker="RECENT RUNS"
            title="直近の記録"
            description="最後に何を実施し、どこへ証跡を残したかを時系列で確認します。"
          >
            <div className="space-y-3">
              {data.recentRuns.length === 0 ? (
                <div className="ds-radius-command bg-slate-50 px-4 py-4 text-sm text-slate-600">まだ記録はありません。</div>
              ) : (
                data.recentRuns.map((item) => (
                  <article key={item.id} className="ds-radius-command border border-slate-200/80 bg-white px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 ds-text-xs-compact font-semibold text-slate-700">
                        {item.operationLabel}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 ds-text-xs-compact font-semibold ${toneChip(item.status === "needs_followup" ? "followup" : "ok")}`}>
                        {item.status === "needs_followup" ? "要フォローアップ" : "完了"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{item.completedAt}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      scope: {item.organizationScope} / {item.organizationId ? organizationLabelMap.get(`${item.organizationScope}:${item.organizationId}`) ?? `ID ${item.organizationId}` : "-"}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">次回期限: {item.nextDueAt ?? "未設定"}</p>
                    <p className="mt-1 text-sm text-slate-600">記録者: {item.reportedByUserName ?? "不明"}</p>
                    <p className="mt-1 text-sm text-slate-600">証跡: {item.evidenceType} / {item.evidenceLocation || "-"}</p>
                    {item.evidenceReference ? <p className="mt-1 text-sm text-slate-600">参照番号: {item.evidenceReference}</p> : null}
                    {item.supersedesRunId ? <p className="mt-1 text-sm text-slate-600">訂正元: #{item.supersedesRunId}</p> : null}
                    <p className="mt-1 text-sm text-slate-600">保持期限: {item.retentionUntil}</p>
                    {item.evidenceNotes ? <p className="mt-2 text-sm leading-6 text-slate-600">{item.evidenceNotes}</p> : null}
                    {item.notes ? <p className="mt-2 text-sm leading-6 text-slate-600">{item.notes}</p> : null}
                  </article>
                ))
              )}
            </div>
          </AdminWorkbenchSection>

          <AdminWorkbenchSection
            kicker="GUIDELINE POSITION"
            title="この画面の位置づけ"
            description="導入先実データがなくても、システムが持つべき準拠技術を先に具備します。"
          >
            <div className="space-y-3">
              <div className="ds-radius-command border border-orange-100 bg-orange-50/40 px-4 py-4 text-sm leading-6 text-slate-700">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <ClipboardDocumentCheckIcon className="h-4 w-4 text-orange-600" aria-hidden />
                  実施証跡の保持
                </div>
                監査、棚卸、訓練、見直しの実施履歴と次回期限を、docs だけでなくシステム内でも追えるようにします。
              </div>
              <div className="ds-radius-command border border-slate-200/80 bg-white px-4 py-4 text-sm leading-6 text-slate-700">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <ShieldExclamationIcon className="h-4 w-4 text-slate-700" aria-hidden />
                  導入時差し替え前提
                </div>
                実名責任者や実保管場所は導入時に埋める前提とし、この画面では `いつ・何を・誰が・次はいつか` を保持します。
              </div>
            </div>
          </AdminWorkbenchSection>
        </div>
      </div>
    </SettingPageLayout>
  );
}
