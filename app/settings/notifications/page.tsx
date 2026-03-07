import { EmsNotificationsSettingsForm } from "@/components/settings/EmsNotificationsSettingsForm";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingSection } from "@/components/settings/SettingSection";
import { ensureEmsSettingsSchema } from "@/lib/emsSettingsSchema";
import { getAuthenticatedUser } from "@/lib/authContext";
import { getDefaultEmsNotificationSettings, getEmsNotificationSettings } from "@/lib/emsSettingsRepository";

export default async function EmsNotificationSettingsPage() {
  await ensureEmsSettingsSchema();
  const user = await getAuthenticatedUser();
  const initialValues = user?.role === "EMS" ? await getEmsNotificationSettings(user.id) : getDefaultEmsNotificationSettings();

  return (
    <SettingPageLayout
      eyebrow="EMS SETTINGS"
      title="通知設定"
      description="救急隊の受信通知を調整する領域です。今回は保存先を持たず、UI と権限表現の土台を整えています。"
    >
      <SettingSection title="通知トグル" description="変更すると即時保存されます。">
        <EmsNotificationsSettingsForm initialValues={initialValues} />
      </SettingSection>
    </SettingPageLayout>
  );
}
