import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingSection } from "@/components/settings/SettingSection";

const items = [
  { label: "新規要請通知", value: true },
  { label: "返信到着通知", value: true },
  { label: "搬送決定通知", value: true },
  { label: "辞退通知", value: true },
  { label: "再通知", value: false },
] as const;

export default function HospitalNotificationSettingsPage() {
  return (
    <SettingPageLayout
      eyebrow="HOSPITAL SETTINGS"
      title="通知設定"
      description="病院側の受信通知ポリシーを調整するための画面です。今は UI のみ先行実装しています。"
    >
      <SettingSection title="通知トグル" description="editable の見た目を実装しています。">
        <div className="space-y-3">
          {items.map((item) => (
            <label key={item.label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                <p className="mt-1 text-sm text-slate-500">永続化は次フェーズで接続します。</p>
              </div>
              <input type="checkbox" defaultChecked={item.value} className="h-5 w-5 accent-emerald-600" />
            </label>
          ))}
        </div>
      </SettingSection>
    </SettingPageLayout>
  );
}
