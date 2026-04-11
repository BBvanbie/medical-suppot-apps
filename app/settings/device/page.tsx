import { CurrentDeviceStatusPanel } from "@/components/settings/CurrentDeviceStatusPanel";
import { ReadOnlySettingsSection } from "@/components/settings/ReadOnlySettingsSection";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { getEmsSettingsProfile } from "@/lib/settingsProfiles";

export default async function EmsDeviceSettingsPage() {
  const profile = await getEmsSettingsProfile();

  return (
    <SettingPageLayout
      tone="ems"
      eyebrow="端末情報"
      title="端末情報"
      description="現在ログインしている救急隊アカウントに紐づく端末認証状態と基本情報を確認できます。"
    >
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">現在の端末認証状態</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">登録済み端末かどうか、WebAuthn MFA の状態、端末キーの短縮表示を確認できます。</p>
        </div>
        <CurrentDeviceStatusPanel tone="ems" />
      </section>
      <ReadOnlySettingsSection
        tone="ems"
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
