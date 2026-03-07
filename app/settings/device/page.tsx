import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingReadOnlyBadge } from "@/components/settings/SettingReadOnlyBadge";
import { SettingSection } from "@/components/settings/SettingSection";
import { getEmsSettingsProfile } from "@/lib/settingsProfiles";

export default async function EmsDeviceSettingsPage() {
  const profile = await getEmsSettingsProfile();

  return (
    <SettingPageLayout
      eyebrow="EMS SETTINGS"
      title="端末情報"
      description="現在ログインしている救急隊端末に紐づく情報です。端末の所属変更や再登録はここでは行えません。"
    >
      <SettingSection title="参照情報" description="このセクションは readOnly です。">
        <div className="mb-4 flex justify-end">
          <SettingReadOnlyBadge />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { label: "所属隊名", value: profile?.teamName ?? "未所属" },
            { label: "隊コード", value: profile?.teamCode ?? "-" },
            { label: "所属部", value: profile?.division ?? "-" },
            { label: "アカウント名", value: profile?.displayName ?? "-" },
            { label: "ユーザー名", value: profile?.username ?? "-" },
            { label: "最終ログイン", value: profile?.lastLoginAt ?? "不明" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>
      </SettingSection>
    </SettingPageLayout>
  );
}
