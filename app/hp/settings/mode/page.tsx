import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingSection } from "@/components/settings/SettingSection";
import { TrainingModeGuidePanel } from "@/components/settings/TrainingModeGuidePanel";
import { UserModeSettingsForm } from "@/components/settings/UserModeSettingsForm";
import { getAuthenticatedUser } from "@/lib/authContext";

export default async function HospitalUserModeSettingsPage() {
  const user = await getAuthenticatedUser();

  return (
    <SettingPageLayout
      tone="hospital"
      eyebrow="HOSPITAL SETTINGS"
      title="運用モード"
      description="LIVE と TRAINING を切り替えます。保存後は training 一覧と live 一覧を混在させず、現在モードだけを表示します。"
      sectionLabel="運用モード"
      heroNote="設定トップと同じ header で、mode 切替と運用ガイドを同じページ上で確認できる構成にしています。"
    >
      <SettingSection
        tone="hospital"
        title="表示対象の切替"
        description="訓練モード中は訓練案件だけを閲覧・応答します。本番一覧や本番通知は表示しません。"
      >
        <UserModeSettingsForm initialMode={user?.currentMode ?? "LIVE"} tone="hospital" />
      </SettingSection>
      <SettingSection
        tone="hospital"
        title="訓練 / デモモードの使い方"
        description="受入要請、相談、患者一覧を訓練データだけで扱う前提を整理しています。"
      >
        <TrainingModeGuidePanel role="HOSPITAL" tone="hospital" />
      </SettingSection>
    </SettingPageLayout>
  );
}
