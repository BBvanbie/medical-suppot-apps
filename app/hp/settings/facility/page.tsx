import { HospitalFacilitySettingsForm } from "@/components/settings/HospitalFacilitySettingsForm";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingReadOnlyBadge } from "@/components/settings/SettingReadOnlyBadge";
import { SettingSection } from "@/components/settings/SettingSection";
import { getHospitalSettingsProfile } from "@/lib/settingsProfiles";
import { ensureHospitalSettingsSchema } from "@/lib/hospitalSettingsSchema";
import { getAuthenticatedUser } from "@/lib/authContext";
import { getDefaultHospitalFacilityEditableSettings, getHospitalFacilitySettings } from "@/lib/hospitalSettingsRepository";

export default async function HospitalFacilitySettingsPage() {
  const profile = await getHospitalSettingsProfile();
  await ensureHospitalSettingsSchema();
  const user = await getAuthenticatedUser();
  const editableSettings =
    user?.role === "HOSPITAL" && user.hospitalId
      ? await getHospitalFacilitySettings(user.hospitalId)
      : null;
  const initialValues = editableSettings
    ? {
        displayContact: editableSettings.displayContact,
        facilityNote: editableSettings.facilityNote,
      }
    : getDefaultHospitalFacilityEditableSettings();

  return (
    <SettingPageLayout
      eyebrow="HOSPITAL SETTINGS"
      title="施設情報"
      description="病院の正式情報は readOnly、一部の連絡先系情報は後続フェーズで編集可能にする前提です。"
    >
      <SettingSection title="管理対象情報" description="正式情報は readOnly です。">
        <div className="mb-4 flex justify-end">
          <SettingReadOnlyBadge />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { label: "病院名", value: profile?.hospitalName ?? "未設定" },
            { label: "施設コード", value: profile?.facilityCode ?? "-" },
            { label: "所在地", value: profile?.address || "未登録" },
            { label: "代表連絡先", value: profile?.phone || "未登録" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>
      </SettingSection>

      <SettingSection title="運用向け補足情報" description="editable の見た目だけを先行実装しています。">
        <HospitalFacilitySettingsForm initialValues={initialValues} />
      </SettingSection>
    </SettingPageLayout>
  );
}
