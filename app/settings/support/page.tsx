import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { ReadOnlySettingsSection } from "@/components/settings/ReadOnlySettingsSection";

export default function EmsSupportSettingsPage() {
  return (
    <SettingPageLayout
      eyebrow="サポート"
      title="サポート"
      description="マニュアル、問い合わせ方法、運用上の基本情報をまとめて確認できます。"
    >
      <ReadOnlySettingsSection
        title="基本情報"
        description="このセクションは閲覧専用です。"
        items={[
          { label: "操作マニュアル", value: "参照可能" },
          { label: "問い合わせ窓口", value: "参照可能" },
          { label: "障害時の対応", value: "連絡手順を参照" },
          { label: "運用資料", value: "参照可能" },
        ]}
      />
    </SettingPageLayout>
  );
}
