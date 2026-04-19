import Link from "next/link";
import { BookOpenIcon, CircleStackIcon, SwatchIcon } from "@heroicons/react/24/solid";

import { AdminWorkbenchMetric, AdminWorkbenchSection } from "@/components/admin/AdminWorkbench";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { requireAdminUser } from "@/lib/admin/adminPageAccess";
import { getAdminMasterSettingsSummary } from "@/lib/admin/adminSettingsRepository";

export default async function AdminMasterSettingsPage() {
  await requireAdminUser();
  const summary = await getAdminMasterSettingsSummary();

  return (
    <SettingPageLayout
      tone="admin"
      eyebrow="ADMIN SETTINGS"
      title="マスタ設定"
      description="病院、隊、診療科、診療科可用性の基礎件数と参照資料をまとめた Admin 向けの専用ページです。編集より先に、正本がどこにあるかを把握できる構成にしています。"
      sectionLabel="マスタ"
      heroNote="マスタの正本が docs と DB のどこにあるかを先に揃え、運用判断時に迷わないようにしています。"
    >
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <AdminWorkbenchMetric label="HOSPITALS" value={summary.hospitalCount} hint="病院マスタ件数" tone="accent" />
        <AdminWorkbenchMetric label="TEAMS" value={summary.teamCount} hint="救急隊マスタ件数" tone="accent" />
        <AdminWorkbenchMetric label="DEPARTMENTS" value={summary.departmentCount} hint="診療科マスタ件数" tone="accent" />
        <AdminWorkbenchMetric label="MAPPINGS" value={summary.hospitalDepartmentCount} hint="病院-診療科紐付け" />
        <AdminWorkbenchMetric label="AVAILABILITY" value={summary.departmentAvailabilityCount} hint="可用性 override 件数" />
      </section>

      <AdminWorkbenchSection
        kicker="MASTER SUMMARY"
        title="どのマスタを見ているか"
        description="件数と正本を近接配置し、どの資料 / テーブルを確認すべきかを明確にします。"
      >
        <div className="grid gap-4 xl:grid-cols-3">
          <article className="rounded-[24px] border border-slate-200/80 bg-slate-50/70 px-5 py-5">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                <CircleStackIcon className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400">ORG MASTER</p>
                <h2 className="mt-2 text-lg font-bold text-slate-950">病院 / 隊</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">病院と救急隊の基礎件数を確認し、導入前の正本と差がないかを見ます。</p>
                <div className="mt-4 rounded-2xl bg-white px-4 py-4 text-sm leading-6 text-slate-600">
                  <p>病院: {summary.hospitalCount} 件</p>
                  <p>救急隊: {summary.teamCount} 件</p>
                </div>
              </div>
            </div>
          </article>
          <article className="rounded-[24px] border border-slate-200/80 bg-slate-50/70 px-5 py-5">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                <SwatchIcon className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400">DEPARTMENT MASTER</p>
                <h2 className="mt-2 text-lg font-bold text-slate-950">診療科</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">診療科マスタと病院紐付け、availability override の分布を確認します。</p>
                <div className="mt-4 rounded-2xl bg-white px-4 py-4 text-sm leading-6 text-slate-600">
                  <p>診療科: {summary.departmentCount} 件</p>
                  <p>紐付け: {summary.hospitalDepartmentCount} 件</p>
                  <p>override: {summary.departmentAvailabilityCount} 件</p>
                </div>
              </div>
            </div>
          </article>
          <article className="rounded-[24px] border border-slate-200/80 bg-slate-50/70 px-5 py-5">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                <BookOpenIcon className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400">REFERENCE</p>
                <h2 className="mt-2 text-lg font-bold text-slate-950">参照資料</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">責任分界、証跡、導入時のオンボーディング資料をここから確認します。</p>
                <div className="mt-4 rounded-2xl bg-white px-4 py-4 text-sm leading-6 text-slate-600">
                  <p>`docs/medical-safety-responsibility-matrix.md`</p>
                  <p>`docs/medical-safety-evidence-matrix.md`</p>
                  <p>`docs/operations/deployment-onboarding-guide.md`</p>
                </div>
              </div>
            </div>
          </article>
        </div>
      </AdminWorkbenchSection>

      <AdminWorkbenchSection
        kicker="NEXT ACTION"
        title="マスタ確認の次の導線"
        description="DB 件数を見たあとに、そのまま確認する docs と画面です。"
      >
        <div className="grid gap-4 xl:grid-cols-3">
          <Link
            href="/admin/settings/support#master"
            className="rounded-[24px] border border-orange-100/80 bg-orange-50/35 px-5 py-5 text-sm font-semibold text-slate-900 transition hover:border-orange-200 hover:bg-orange-50/60"
          >
            責任分界 / 証跡資料を開く
            <p className="mt-2 text-xs font-normal leading-5 text-slate-500">運用上の正本、証跡保管責任、導入時の差し替えポイントを確認します。</p>
          </Link>
          <Link
            href="/admin/monitoring"
            className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 px-5 py-5 text-sm font-semibold text-slate-900 transition hover:border-orange-200 hover:bg-orange-50/50"
          >
            監視 workbench を開く
            <p className="mt-2 text-xs font-normal leading-5 text-slate-500">マスタ差し替え後に通知や API failure が出ていないかを続けて確認します。</p>
          </Link>
          <article className="rounded-[24px] border border-slate-200/80 bg-white px-5 py-5 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">運用メモ</p>
            <p className="mt-2 leading-6 text-slate-600">本番で件数を増やす操作はこのページでは行いません。まず導入時正本と DB 件数が合っているかを確認してから、別手順で投入します。</p>
          </article>
        </div>
      </AdminWorkbenchSection>
    </SettingPageLayout>
  );
}
