import { SettingActionButton } from "@/components/settings/SettingActionButton";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingSection } from "@/components/settings/SettingSection";

export default function HospitalOperationsSettingsPage() {
  return (
    <SettingPageLayout
      eyebrow="HOSPITAL SETTINGS"
      title="受入運用設定"
      description="要相談テンプレートや受入不可テンプレートなど、病院運用に関わる項目をまとめます。"
    >
      <SettingSection title="テンプレート設定" description="保存 API はまだ未接続です。">
        <div className="grid gap-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">要相談テンプレート</span>
            <textarea rows={4} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none" defaultValue="要相談: 詳細確認後に折り返します。" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">受入不可テンプレート</span>
            <textarea rows={4} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none" defaultValue="現在受入困難です。別施設をご検討ください。" />
          </label>
        </div>
        <div className="mt-4">
          <SettingActionButton tone="secondary" disabled>
            保存機能は次フェーズで追加
          </SettingActionButton>
        </div>
      </SettingSection>
    </SettingPageLayout>
  );
}
