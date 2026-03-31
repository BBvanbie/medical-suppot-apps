import { OfflineQueuePage } from "@/components/settings/OfflineQueuePage";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";

export default function EmsOfflineQueueRoutePage() {
  return (
    <SettingPageLayout
      tone="ems"
      eyebrow="オフライン"
      title="未送信キュー"
      description="オフライン中に保留された操作や未送信の項目を確認します。送信系は自動送信されないため、内容を確認してから扱ってください。"
    >
      <OfflineQueuePage />
    </SettingPageLayout>
  );
}
