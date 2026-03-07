import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingSection } from "@/components/settings/SettingSection";

const items = [
  { label: "新着回答通知", value: true },
  { label: "要相談通知", value: true },
  { label: "受入可能通知", value: true },
  { label: "受入不可通知", value: false },
  { label: "再通知", value: true },
] as const;

export default function EmsNotificationSettingsPage() {
  return (
    <SettingPageLayout
      eyebrow="EMS SETTINGS"
      title="通知設定"
      description="救急隊の受信通知を調整する領域です。今回は保存先を持たず、UI と権限表現の土台を整えています。"
    >
      <SettingSection title="通知トグル" description="editable セクションの見え方を先行実装しています。">
        <div className="space-y-3">
          {items.map((item) => (
            <label key={item.label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                <p className="mt-1 text-sm text-slate-500">保存機能は次フェーズで接続します。</p>
              </div>
              <input type="checkbox" defaultChecked={item.value} className="h-5 w-5 accent-blue-600" />
            </label>
          ))}
        </div>
      </SettingSection>
    </SettingPageLayout>
  );
}
