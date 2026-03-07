import { EmsInputSettingsForm } from "@/components/settings/EmsInputSettingsForm";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingSection } from "@/components/settings/SettingSection";
import { getAuthenticatedUser } from "@/lib/authContext";
import { getDefaultEmsInputSettings, getEmsInputSettings } from "@/lib/emsSettingsRepository";
import { ensureEmsSettingsSchema } from "@/lib/emsSettingsSchema";

export default async function EmsInputSettingsPage() {
  await ensureEmsSettingsSchema();
  const user = await getAuthenticatedUser();
  const initialValues = user?.role === "EMS" ? await getEmsInputSettings(user.id) : getDefaultEmsInputSettings();

  return (
    <SettingPageLayout
      eyebrow="EMS SETTINGS"
      title="入力補助"
      description="入力操作を軽くするための設定です。固定仕様にしたい項目は後続で制御を追加します。"
    >
      <SettingSection title="入力補助オプション" description="変更すると即時保存されます。">
        <EmsInputSettingsForm initialValues={initialValues} />
      </SettingSection>
    </SettingPageLayout>
  );
}
