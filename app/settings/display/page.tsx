import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingSection } from "@/components/settings/SettingSection";

export default function EmsDisplaySettingsPage() {
  return (
    <SettingPageLayout
      eyebrow="EMS SETTINGS"
      title="表示設定"
      description="文字サイズや一覧の見やすさに関する設定です。今回は editable の見た目を先行実装しています。"
    >
      <SettingSection title="表示オプション" description="保存 API はまだ未接続です。">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">文字サイズ</span>
            <select className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none">
              <option>標準</option>
              <option>大きめ</option>
              <option>最大</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">一覧表示密度</span>
            <select className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none">
              <option>標準</option>
              <option>広め</option>
              <option>コンパクト</option>
            </select>
          </label>
        </div>
      </SettingSection>
    </SettingPageLayout>
  );
}
