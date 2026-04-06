import { AdminTrainingResetForm } from "@/components/admin/AdminTrainingResetForm";
import { AdminWorkbenchPage, AdminWorkbenchSection } from "@/components/admin/AdminWorkbench";
import { UserModeSettingsForm } from "@/components/settings/UserModeSettingsForm";
import { getAuthenticatedUser } from "@/lib/authContext";
import { getTrainingDataSummary } from "@/lib/trainingDataAdminRepository";

export default async function AdminUserModeSettingsPage() {
  const [user, trainingSummary] = await Promise.all([getAuthenticatedUser(), getTrainingDataSummary()]);

  return (
    <AdminWorkbenchPage
      eyebrow="ADMIN MODE"
      title="運用モード"
      description="管理者も LIVE / TRAINING を切り替えて監視します。同時表示ではなく、現在のモードだけを監視対象にします。"
    >
      <AdminWorkbenchSection
        kicker="MODE SWITCH"
        title="表示対象の切替"
        description="TRAINING は訓練データのみを表示し、本番一覧、本番通知、本番集計には混入しません。"
      >
        <UserModeSettingsForm initialMode={user?.currentMode ?? "LIVE"} tone="admin" />
      </AdminWorkbenchSection>
      <AdminWorkbenchSection
        kicker="TRAINING RESET"
        title="訓練データの一括リセット"
        description="営業デモや院内訓練の後片付け用です。TRAINING データだけを削除し、本番データには触れません。"
      >
        <AdminTrainingResetForm initialSummary={trainingSummary} />
      </AdminWorkbenchSection>
    </AdminWorkbenchPage>
  );
}
