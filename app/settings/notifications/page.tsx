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
      tone="ems"
      eyebrow="通知設定"
      title="通知設定"
      description="救急隊への新着通知を調整する画面です。音と視覚表示の両方を業務に合わせて設定できます。"
    >
      <SettingSection tone="ems" title="通知トグル" description="変更すると即時保存されます。">
        <EmsNotificationsSettingsForm initialValues={initialValues} />
      </SettingSection>
    </SettingPageLayout>
  );
}
