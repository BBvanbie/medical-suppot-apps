import { HospitalDisplaySettingsForm } from "@/components/settings/HospitalDisplaySettingsForm";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingSection } from "@/components/settings/SettingSection";
import { getAuthenticatedUser } from "@/lib/authContext";
import { getDefaultHospitalDisplaySettings, getHospitalDisplaySettings } from "@/lib/hospitalSettingsRepository";
import { ensureHospitalSettingsSchema } from "@/lib/hospitalSettingsSchema";

export default async function HospitalDisplaySettingsPage() {
  await ensureHospitalSettingsSchema();
  const user = await getAuthenticatedUser();
  const initialValues =
    user?.role === "HOSPITAL" && user.hospitalId
      ? await getHospitalDisplaySettings(user.hospitalId)
      : getDefaultHospitalDisplaySettings();

  return (
    <SettingPageLayout
      eyebrow="HOSPITAL SETTINGS"
      title="表示設定"
      description="病院一覧や受入要請一覧の見え方に関する設定です。保存処理は後続で追加します。"
    >
      <SettingSection title="表示オプション" description="変更すると即時保存されます。">
        <HospitalDisplaySettingsForm initialValues={initialValues} />
      </SettingSection>
    </SettingPageLayout>
  );
}
