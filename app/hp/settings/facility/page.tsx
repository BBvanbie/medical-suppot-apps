import { SettingActionButton } from "@/components/settings/SettingActionButton";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingReadOnlyBadge } from "@/components/settings/SettingReadOnlyBadge";
import { SettingSection } from "@/components/settings/SettingSection";
import { getHospitalSettingsProfile } from "@/lib/settingsProfiles";

export default async function HospitalFacilitySettingsPage() {
  const profile = await getHospitalSettingsProfile();

  return (
    <SettingPageLayout
      eyebrow="HOSPITAL SETTINGS"
      title="施設情報"
      description="病院の正式情報は readOnly、一部の連絡先系情報は後続フェーズで編集可能にする前提です。"
    >
      <SettingSection title="管理対象情報" description="正式情報は readOnly です。">
        <div className="mb-4 flex justify-end">
          <SettingReadOnlyBadge />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { label: "病院名", value: profile?.hospitalName ?? "未設定" },
            { label: "施設コード", value: profile?.facilityCode ?? "-" },
            { label: "所在地", value: profile?.address || "未登録" },
            { label: "代表連絡先", value: profile?.phone || "未登録" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>
      </SettingSection>

      <SettingSection title="運用向け補足情報" description="editable の見た目だけを先行実装しています。">
        <div className="grid gap-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">表示用連絡先</span>
            <input defaultValue={profile?.phone || ""} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">利用者向け補足文</span>
            <textarea rows={4} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none" defaultValue="" />
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
