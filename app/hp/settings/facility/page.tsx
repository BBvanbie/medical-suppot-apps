import { HospitalFacilitySettingsForm } from "@/components/settings/HospitalFacilitySettingsForm";
import { ReadOnlySettingsSection } from "@/components/settings/ReadOnlySettingsSection";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingSection } from "@/components/settings/SettingSection";
import { getAuthenticatedUser } from "@/lib/authContext";
import { ensureHospitalSettingsSchema } from "@/lib/hospitalSettingsSchema";
import { getDefaultHospitalFacilityEditableSettings, getHospitalFacilitySettings } from "@/lib/hospitalSettingsRepository";
import { getHospitalSettingsProfile } from "@/lib/settingsProfiles";

export default async function HospitalFacilitySettingsPage() {
  const profile = await getHospitalSettingsProfile();
  await ensureHospitalSettingsSchema();
  const user = await getAuthenticatedUser();
  const editableSettings =
    user?.role === "HOSPITAL" && user.hospitalId ? await getHospitalFacilitySettings(user.hospitalId) : null;

  const initialValues = editableSettings
    ? {
        displayContact: editableSettings.displayContact,
        facilityNote: editableSettings.facilityNote,
      }
    : getDefaultHospitalFacilityEditableSettings();

  return (
    <SettingPageLayout
      tone="hospital"
      eyebrow="HOSPITAL SETTINGS"
      title="施設情報"
      description="病院の正式情報は readOnly、連絡先表示や補足文は運用向けに編集できます。"
    >
      <ReadOnlySettingsSection
        tone="hospital"
        title="管理対象情報"
        description="正式情報は readOnly です。"
        items={[
          { label: "病院名", value: profile?.hospitalName ?? "未設定" },
          { label: "施設コード", value: profile?.facilityCode ?? "-" },
          { label: "住所", value: profile?.address || "未登録" },
          { label: "代表連絡先", value: profile?.phone || "未登録" },
        ]}
      />

      <SettingSection tone="hospital" title="運用向け補足情報" description="表示用連絡先や補足メモを編集できます。">
        <HospitalFacilitySettingsForm initialValues={initialValues} />
      </SettingSection>
    </SettingPageLayout>
  );
}
