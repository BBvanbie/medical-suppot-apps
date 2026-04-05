import { EmsDisplaySettingsForm } from "@/components/settings/EmsDisplaySettingsForm";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingSection } from "@/components/settings/SettingSection";
import { getAuthenticatedUser } from "@/lib/authContext";
import { getDefaultEmsDisplaySettings, getEmsDisplaySettings } from "@/lib/emsSettingsRepository";
import { ensureEmsSettingsSchema } from "@/lib/emsSettingsSchema";

export default async function EmsDisplaySettingsPage() {
  await ensureEmsSettingsSchema();
  const user = await getAuthenticatedUser();
  const initialValues = user?.role === "EMS" ? await getEmsDisplaySettings(user.id) : getDefaultEmsDisplaySettings();

  return (
    <SettingPageLayout
      tone="ems"
      eyebrow="表示設定"
      title="表示設定"
      description="文字サイズや一覧表示の見え方を調整できます。スライダーを動かすと画面へ即時反映され、保存すると次回以降も保持されます。"
    >
      <SettingSection
        tone="ems"
        title="表示オプション"
        description="文字サイズと表示密度を調整できます。変更内容はすぐ画面に反映されます。保存すると次回以降も同じ設定で利用できます。"
      >
        <EmsDisplaySettingsForm initialValues={initialValues} />
      </SettingSection>
    </SettingPageLayout>
  );
}
