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
      tone="ems"
      eyebrow="入力補助"
      title="入力補助"
      description="入力時の補助設定です。現場で入力手順の負荷を下げるための項目を調整できます。"
    >
      <SettingSection tone="ems" title="入力補助オプション" description="変更すると即時保存されます。">
        <EmsInputSettingsForm initialValues={initialValues} />
      </SettingSection>
    </SettingPageLayout>
  );
}
