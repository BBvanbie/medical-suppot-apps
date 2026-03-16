import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { ReadOnlySettingsSection } from "@/components/settings/ReadOnlySettingsSection";

export default function HospitalSupportSettingsPage() {
  return (
    <SettingPageLayout
      tone="hospital"
      eyebrow="HOSPITAL SETTINGS"
      title="サポート"
      description="病院側で参照するマニュアル、運用案内、問い合わせ先をまとめています。"
    >
      <ReadOnlySettingsSection
        title="参照情報"
        description="このセクションは readOnly です。"
        items={[
          { label: "操作マニュアル", value: "利用可能" },
          { label: "障害時案内", value: "確認手順を参照" },
          { label: "保守契約", value: "利用可能" },
          { label: "プライバシーポリシー", value: "利用可能" },
        ]}
      />
    </SettingPageLayout>
  );
}
