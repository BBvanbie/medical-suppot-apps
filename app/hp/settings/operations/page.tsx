import { HospitalOperationsSettingsForm } from "@/components/settings/HospitalOperationsSettingsForm";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingSection } from "@/components/settings/SettingSection";
import { getAuthenticatedUser } from "@/lib/authContext";
import { getDefaultHospitalOperationsSettings, getHospitalOperationsSettings } from "@/lib/hospitalSettingsRepository";
import { ensureHospitalSettingsSchema } from "@/lib/hospitalSettingsSchema";

export default async function HospitalOperationsSettingsPage() {
  await ensureHospitalSettingsSchema();
  const user = await getAuthenticatedUser();
  const initialValues =
    user?.role === "HOSPITAL" && user.hospitalId
      ? await getHospitalOperationsSettings(user.hospitalId)
      : getDefaultHospitalOperationsSettings();

  return (
    <SettingPageLayout
      eyebrow="HOSPITAL SETTINGS"
      title="受入運用設定"
      description="要相談テンプレートや受入不可テンプレートなど、病院運用に関わる項目をまとめます。"
    >
      <SettingSection title="テンプレート設定" description="差分がある場合のみ、確認ダイアログ経由で保存します。">
        <HospitalOperationsSettingsForm initialValues={initialValues} />
      </SettingSection>
    </SettingPageLayout>
  );
}
