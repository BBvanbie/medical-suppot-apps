import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { ReadOnlySettingsSection } from "@/components/settings/ReadOnlySettingsSection";
import { getEmsSettingsProfile } from "@/lib/settingsProfiles";

export default async function EmsDeviceSettingsPage() {
  const profile = await getEmsSettingsProfile();

  return (
    <SettingPageLayout
      eyebrow="端末情報"
      title="端末情報"
      description="現在ログインしている救急隊アカウントに紐づく基本情報を確認できます。端末側で変更できる項目はありません。"
    >
      <ReadOnlySettingsSection
        title="基本情報"
        description="このセクションは閲覧専用です。"
        items={[
          { label: "所属隊", value: profile?.teamName ?? "未設定" },
          { label: "隊コード", value: profile?.teamCode ?? "-" },
          { label: "所属部別", value: profile?.division ?? "-" },
          { label: "アカウント名", value: profile?.displayName ?? "-" },
          { label: "ユーザーID", value: profile?.username ?? "-" },
          { label: "最終ログイン", value: profile?.lastLoginAt ?? "不明" },
        ]}
      />
    </SettingPageLayout>
  );
}
