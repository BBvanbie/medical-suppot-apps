import { HospitalNotificationSettingsForm } from "@/components/settings/HospitalNotificationSettingsForm";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingSection } from "@/components/settings/SettingSection";
import { getAuthenticatedUser } from "@/lib/authContext";
import { getDefaultHospitalNotificationSettings, getHospitalNotificationSettings } from "@/lib/hospitalSettingsRepository";
import { ensureHospitalSettingsSchema } from "@/lib/hospitalSettingsSchema";

export default async function HospitalNotificationSettingsPage() {
  await ensureHospitalSettingsSchema();
  const user = await getAuthenticatedUser();
  const initialValues =
    user?.role === "HOSPITAL" && user.hospitalId
      ? await getHospitalNotificationSettings(user.hospitalId)
      : getDefaultHospitalNotificationSettings();

  return (
    <SettingPageLayout
      tone="hospital"
      eyebrow="HOSPITAL SETTINGS"
      title="通知設定"
      description="病院側の受信通知ポリシーを調整するための画面です。今は UI のみ先行実装しています。"
      sectionLabel="通知設定"
      heroNote="設定トップと同じ header で、通知ポリシーの変更対象と即時保存の前提を先に示します。"
    >
      <SettingSection tone="hospital" title="通知トグル" description="変更すると即時保存されます。">
        <HospitalNotificationSettingsForm initialValues={initialValues} />
      </SettingSection>
    </SettingPageLayout>
  );
}
