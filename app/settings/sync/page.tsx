import { EmsSyncSettingsForm } from "@/components/settings/EmsSyncSettingsForm";
import { ReadOnlySettingsSection } from "@/components/settings/ReadOnlySettingsSection";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
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
      description="通信状態や同期の実行状況を確認し、必要に応じて手動同期や再送を実行できます。"
    >
      <ReadOnlySettingsSection
        title="同期サマリー"
        description="現在の通信状態を readOnly で確認できます。"
        items={[
          { label: "接続状態", value: "オンライン" },
          { label: "最終ログイン", value: profile?.lastLoginAt ?? "不明" },
          { label: "未送信件数", value: "0件" },
        ]}
      />

      <SettingSection title="同期アクション" description="ボタン操作で同期を実行できます。">
        <EmsSyncSettingsForm initialState={syncState} />
      </SettingSection>
    </SettingPageLayout>
  );
}
