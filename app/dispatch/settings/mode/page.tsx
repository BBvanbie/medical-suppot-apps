import { redirect } from "next/navigation";

import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingSection } from "@/components/settings/SettingSection";
import { TrainingModeGuidePanel } from "@/components/settings/TrainingModeGuidePanel";
import { UserModeSettingsForm } from "@/components/settings/UserModeSettingsForm";
import { getAuthenticatedUser } from "@/lib/authContext";

export default async function DispatchUserModeSettingsPage() {
  const user = await getAuthenticatedUser();
  if (!user || (user.role !== "DISPATCH" && user.role !== "ADMIN")) {
    redirect("/login");
  }

  return (
    <SettingPageLayout
      tone="dispatch"
      eyebrow="DISPATCH MODE"
      title="運用モード"
      description="LIVE と TRAINING を切り替えます。保存後は指令一覧と起票対象を現在モードだけに固定します。"
    >
      <SettingSection
        tone="dispatch"
        title="表示対象の切替"
        description="指令 role でも同時表示はせず、現在選択したモードだけを一覧と起票に反映します。"
      >
        <UserModeSettingsForm initialMode={user.currentMode} tone="dispatch" />
      </SettingSection>
      <SettingSection
        tone="dispatch"
        title="訓練 / デモモードの使い方"
        description="開始前確認、指令起票の流れ、注意点、FAQ をこの画面で確認できます。"
      >
        <TrainingModeGuidePanel role="DISPATCH" tone="dispatch" />
      </SettingSection>
    </SettingPageLayout>
  );
}
