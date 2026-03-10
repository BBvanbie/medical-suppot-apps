import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { ReadOnlySettingsSection } from "@/components/settings/ReadOnlySettingsSection";

export default function EmsSupportSettingsPage() {
  return (
    <SettingPageLayout
      eyebrow="EMS SETTINGS"
      title="サポート"
      description="マニュアル、問い合わせ先、運用上の参照情報をまとめています。"
    >
      <ReadOnlySettingsSection
        title="参照情報"
        description="このセクションは readOnly です。"
        items={[
          { label: "操作マニュアル", value: "利用可能" },
          { label: "問い合わせ窓口", value: "利用可能" },
          { label: "障害時案内", value: "確認手順を参照" },
          { label: "保守契約", value: "利用可能" },
        ]}
      />
    </SettingPageLayout>
  );
}
