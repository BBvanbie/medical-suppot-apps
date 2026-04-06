import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingSection } from "@/components/settings/SettingSection";
import { UserModeSettingsForm } from "@/components/settings/UserModeSettingsForm";
import { getAuthenticatedUser } from "@/lib/authContext";

export default async function HospitalUserModeSettingsPage() {
  const user = await getAuthenticatedUser();

  return (
    <SettingPageLayout
      tone="hospital"
      eyebrow="MODE"
      title="運用モード"
      description="LIVE と TRAINING を切り替えます。保存後は training 一覧と live 一覧を混在させず、現在モードだけを表示します。"
    >
      <SettingSection
        tone="hospital"
        title="表示対象の切替"
        description="訓練モード中は訓練案件だけを閲覧・応答します。本番一覧や本番通知は表示しません。"
      >
        <UserModeSettingsForm initialMode={user?.currentMode ?? "LIVE"} tone="hospital" />
      </SettingSection>
    </SettingPageLayout>
  );
}
