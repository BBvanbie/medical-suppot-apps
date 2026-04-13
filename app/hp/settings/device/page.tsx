import { CurrentDeviceStatusPanel } from "@/components/settings/CurrentDeviceStatusPanel";
import { ReadOnlySettingsSection } from "@/components/settings/ReadOnlySettingsSection";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { getHospitalSettingsProfile } from "@/lib/settingsProfiles";

export default async function HospitalDeviceSettingsPage() {
  const profile = await getHospitalSettingsProfile();

  return (
    <SettingPageLayout
      tone="hospital"
      eyebrow="HOSPITAL SETTINGS"
      title="端末情報"
      description="現在ログインしている病院アカウントに紐づく端末認証状態と基本情報を確認できます。"
      sectionLabel="端末情報"
      heroNote="設定トップと同じ header で、端末認証状態と read only 基本情報を同じ視線順で確認します。"
    >
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">現在の端末認証状態</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">登録済み端末かどうか、WebAuthn MFA の状態、端末キーの短縮表示を確認できます。現在はローカル検証のため HOSPITAL の WebAuthn MFA を一時停止しています。</p>
        </div>
        <CurrentDeviceStatusPanel tone="hospital" />
      </section>
      <ReadOnlySettingsSection
        tone="hospital"
        title="基本情報"
        description="このセクションは閲覧専用です。"
        items={[
          { label: "病院名", value: profile?.hospitalName ?? "未設定" },
          { label: "施設コード", value: profile?.facilityCode ?? "-" },
          { label: "自治体", value: profile?.municipality ?? "-" },
          { label: "アカウント名", value: profile?.displayName ?? "-" },
          { label: "ユーザーID", value: profile?.username ?? "-" },
          { label: "最終ログイン", value: profile?.lastLoginAt ?? "不明" },
        ]}
      />
    </SettingPageLayout>
  );
}
