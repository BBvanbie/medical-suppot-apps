import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingSection } from "@/components/settings/SettingSection";

const items = [
  { label: "テンキー自動表示", checked: true },
  { label: "入力後の自動フォーカス移動", checked: true },
  { label: "バイタル入力時の次項目遷移", checked: true },
  { label: "必須入力警告の強調", checked: true },
] as const;

export default function EmsInputSettingsPage() {
  return (
    <SettingPageLayout
      eyebrow="EMS SETTINGS"
      title="入力補助"
      description="入力操作を軽くするための設定です。固定仕様にしたい項目は後続で制御を追加します。"
    >
      <SettingSection title="入力補助オプション" description="今は UI 表現のみを実装しています。">
        <div className="space-y-3">
          {items.map((item) => (
            <label key={item.label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                <p className="mt-1 text-sm text-slate-500">保存処理は次フェーズで追加します。</p>
              </div>
              <input type="checkbox" defaultChecked={item.checked} className="h-5 w-5 accent-blue-600" />
            </label>
          ))}
        </div>
      </SettingSection>
    </SettingPageLayout>
  );
}
