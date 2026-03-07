import { SettingActionButton } from "@/components/settings/SettingActionButton";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingReadOnlyBadge } from "@/components/settings/SettingReadOnlyBadge";
import { SettingSection } from "@/components/settings/SettingSection";
import { getEmsSettingsProfile } from "@/lib/settingsProfiles";

export default async function EmsSyncSettingsPage() {
  const profile = await getEmsSettingsProfile();

  return (
    <SettingPageLayout
      eyebrow="EMS SETTINGS"
      title="同期"
      description="通信状態と最終同期状況を確認するページです。再試行系の実処理は次フェーズで接続します。"
    >
      <SettingSection title="同期状況" description="状態確認は readOnly です。">
        <div className="mb-4 flex justify-end">
          <SettingReadOnlyBadge />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "通信状態", value: "オンライン" },
            { label: "最終同期日時", value: profile?.lastLoginAt ?? "不明" },
            { label: "未送信件数", value: "0件" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>
      </SettingSection>

      <SettingSection title="再試行アクション" description="ボタン配置だけ先に作り、実行処理は後続で接続します。">
        <div className="flex flex-wrap gap-3">
          <SettingActionButton tone="secondary" disabled>
            手動同期
          </SettingActionButton>
          <SettingActionButton tone="secondary" disabled>
            未送信データ再送
          </SettingActionButton>
        </div>
        <p className="mt-3 text-sm text-slate-500">この初回実装では UI 配置のみです。同期実行 API はまだ未接続です。</p>
      </SettingSection>
    </SettingPageLayout>
  );
}
