import { EmsOperationalModeForm } from "@/components/settings/EmsOperationalModeForm";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingSection } from "@/components/settings/SettingSection";
import { TrainingModeGuidePanel } from "@/components/settings/TrainingModeGuidePanel";
import { UserModeSettingsForm } from "@/components/settings/UserModeSettingsForm";
import { getAuthenticatedUser } from "@/lib/authContext";
import { getEmsOperationalMode } from "@/lib/emsSettingsRepository";

export default async function EmsUserModeSettingsPage() {
  const user = await getAuthenticatedUser();
  const operationalMode = user?.role === "EMS" ? await getEmsOperationalMode(user.id) : "STANDARD";

  return (
    <SettingPageLayout
      tone="ems"
      operationTone={operationalMode === "TRIAGE" ? "triage" : "standard"}
      eyebrow="運用モード"
      title="運用モード"
      description="LIVE と TRAINING を切り替えます。保存後は選択したモードだけを表示し、訓練中のみ training 事案を作成できます。"
    >
      <SettingSection
        tone="ems"
        title="表示対象の切替"
        description="切替はユーザー単位です。本番一覧と訓練一覧は同時表示せず、現在選択中のモードだけを扱います。"
      >
        <UserModeSettingsForm initialMode={user?.currentMode ?? "LIVE"} tone="ems" />
      </SettingSection>
      <SettingSection
        tone="ems"
        title="トリアージ運用"
        description="EMS 専用の業務導線を STANDARD / TRIAGE で切り替えます。LIVE / TRAINING の表示対象とは独立して保存します。"
      >
        <EmsOperationalModeForm initialValue={operationalMode} />
      </SettingSection>
      <SettingSection
        tone="ems"
        title="訓練 / デモモードの使い方"
        description="開始前確認、簡易フロー、注意点、FAQ をこの画面で確認できます。"
      >
        <TrainingModeGuidePanel role="EMS" tone="ems" />
      </SettingSection>
    </SettingPageLayout>
  );
}
