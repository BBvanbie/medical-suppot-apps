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
      eyebrowClassName="text-[var(--accent-blue)]"
      title="\u8868\u793a\u8a2d\u5b9a"
      description="\u6587\u5b57\u30b5\u30a4\u30ba\u3084\u4e00\u89a7\u8868\u793a\u306e\u898b\u3048\u65b9\u306b\u95a2\u3059\u308b\u8a2d\u5b9a\u3067\u3059\u3002\u5909\u66f4\u5f8c\u306b\u4fdd\u5b58\u3059\u308b\u3068\u753b\u9762\u306b\u53cd\u6620\u3055\u308c\u307e\u3059\u3002"
    >
      <SettingSection
        title="\u8868\u793a\u30aa\u30d7\u30b7\u30e7\u30f3"
        description="\u30b9\u30e9\u30a4\u30c0\u30fc\u3067\u8abf\u6574\u3057\u3001\u53f3\u4e0b\u306e\u4fdd\u5b58\u30dc\u30bf\u30f3\u3067\u53cd\u6620\u3057\u307e\u3059\u3002"
      >
        <EmsDisplaySettingsForm initialValues={initialValues} />
      </SettingSection>
    </SettingPageLayout>
  );
}
