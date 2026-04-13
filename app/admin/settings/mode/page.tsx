import { AdminTrainingResetForm } from "@/components/admin/AdminTrainingResetForm";
import { AdminWorkbenchSection } from "@/components/admin/AdminWorkbench";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { TrainingModeGuidePanel } from "@/components/settings/TrainingModeGuidePanel";
import { UserModeSettingsForm } from "@/components/settings/UserModeSettingsForm";
import { requireAdminUser } from "@/lib/admin/adminPageAccess";
import { getTrainingDataSummary } from "@/lib/trainingDataAdminRepository";

export default async function AdminUserModeSettingsPage() {
  const user = await requireAdminUser();
  const trainingSummary = await getTrainingDataSummary();

  return (
    <SettingPageLayout
      tone="admin"
      eyebrow="ADMIN SETTINGS"
      title="運用モード"
      description="管理者も LIVE / TRAINING を切り替えて監視します。同時表示ではなく、現在のモードだけを監視対象にします。"
      sectionLabel="運用モード"
      heroNote="設定トップと同じ header で、mode 切替、training reset、運用ガイドを同じ視線順に並べています。"
    >
      <AdminWorkbenchSection
        kicker="MODE SWITCH"
        title="表示対象の切替"
        description="TRAINING は訓練データのみを表示し、本番一覧、本番通知、本番集計には混入しません。"
      >
        <UserModeSettingsForm initialMode={user.currentMode} tone="admin" />
      </AdminWorkbenchSection>
      <AdminWorkbenchSection
        kicker="TRAINING RESET"
        title="訓練データの一括リセット"
        description="営業デモや院内訓練の後片付け用です。TRAINING データだけを削除し、本番データには触れません。"
      >
        <AdminTrainingResetForm initialSummary={trainingSummary} />
      </AdminWorkbenchSection>
      <AdminWorkbenchSection
        kicker="TRAINING GUIDE"
        title="訓練 / デモモードの使い方"
        description="切替、監視、終了時の reset、FAQ を管理者向けにまとめています。"
      >
        <TrainingModeGuidePanel role="ADMIN" tone="admin" />
      </AdminWorkbenchSection>
    </SettingPageLayout>
  );
}
