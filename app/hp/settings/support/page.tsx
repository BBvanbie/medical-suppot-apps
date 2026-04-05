import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { ReadOnlySettingsSection } from "@/components/settings/ReadOnlySettingsSection";

export default function HospitalSupportSettingsPage() {
  return (
    <SettingPageLayout
      tone="hospital"
      eyebrow="サポート"
      title="サポート"
      description="病院側で参照するマニュアル、問い合わせ先、運用資料をまとめて確認できます。"
    >
      <ReadOnlySettingsSection
        tone="hospital"
        title="基本情報"
        description="このセクションは閲覧専用です。"
        items={[
          { label: "操作マニュアル", value: "参照可能" },
          { label: "問い合わせ窓口", value: "連絡先を参照" },
          { label: "障害時の対応", value: "手順書を参照" },
          { label: "プライバシーポリシー", value: "参照可能" },
        ]}
      />
    </SettingPageLayout>
  );
}
