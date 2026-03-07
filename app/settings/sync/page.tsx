import { EmsSyncSettingsForm } from "@/components/settings/EmsSyncSettingsForm";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingReadOnlyBadge } from "@/components/settings/SettingReadOnlyBadge";
import { SettingSection } from "@/components/settings/SettingSection";
import { getAuthenticatedUser } from "@/lib/authContext";
import { getEmsSyncState } from "@/lib/emsSyncRepository";
import { ensureEmsSyncSchema } from "@/lib/emsSyncSchema";
import { getEmsSettingsProfile } from "@/lib/settingsProfiles";

export default async function EmsSyncSettingsPage() {
  const profile = await getEmsSettingsProfile();
  await ensureEmsSyncSchema();
  const user = await getAuthenticatedUser();
  const syncState =
    user?.role === "EMS"
      ? await getEmsSyncState(user.id)
      : {
          connectionStatus: "online" as const,
          lastSyncAt: null,
          lastRetryAt: null,
          lastSyncStatus: "idle" as const,
          lastRetryStatus: "idle" as const,
          pendingCount: 0,
        };

  return (
    <SettingPageLayout
      eyebrow="EMS SETTINGS"
      title="同期設定"
      description="通信状況の確認と、手動同期や未送信データの再送を行います。現場での利用を前提に、状態確認と実行操作を短時間で完了できる構成にしています。"
    >
      <SettingSection title="同期サマリー" description="現在の通信状態を readOnly で確認できます。">
        <div className="mb-4 flex justify-end">
          <SettingReadOnlyBadge />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "通信状態", value: "オンライン" },
            { label: "最終ログイン日時", value: profile?.lastLoginAt ?? "未取得" },
            { label: "未送信件数", value: "0件" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>
      </SettingSection>

      <SettingSection title="同期アクション" description="ボタン操作で同期を実行できます。">
        <EmsSyncSettingsForm initialState={syncState} />
      </SettingSection>
    </SettingPageLayout>
  );
}
