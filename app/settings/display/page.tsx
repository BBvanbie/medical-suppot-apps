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
      eyebrow="EMS SETTINGS"
      title="表示設定"
      description="文字サイズや一覧表示の見え方に関する設定です。変更内容はすぐに画面へ反映されます。"
    >
      <SettingSection title="表示オプション" description="変更すると即時保存されます。">
        <EmsDisplaySettingsForm initialValues={initialValues} />
      </SettingSection>
    </SettingPageLayout>
  );
}
