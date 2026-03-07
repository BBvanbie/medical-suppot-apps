import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingSection } from "@/components/settings/SettingSection";

export default function HospitalDisplaySettingsPage() {
  return (
    <SettingPageLayout
      eyebrow="HOSPITAL SETTINGS"
      title="表示設定"
      description="病院一覧や受入要請一覧の見え方に関する設定です。保存処理は後続で追加します。"
    >
      <SettingSection title="表示オプション" description="editable の土台として入力 UI を配置しています。">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">一覧表示密度</span>
            <select className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none">
              <option>標準</option>
              <option>広め</option>
              <option>コンパクト</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">初期ソート</span>
            <select className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none">
              <option>更新順</option>
              <option>受信順</option>
              <option>重要度順</option>
            </select>
          </label>
        </div>
      </SettingSection>
    </SettingPageLayout>
  );
}
