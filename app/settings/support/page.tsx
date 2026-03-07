import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingReadOnlyBadge } from "@/components/settings/SettingReadOnlyBadge";
import { SettingSection } from "@/components/settings/SettingSection";

export default function EmsSupportSettingsPage() {
  return (
    <SettingPageLayout
      eyebrow="EMS SETTINGS"
      title="サポート"
      description="マニュアル、よくある質問、連絡先など、参照専用の情報をまとめています。"
    >
      <SettingSection title="参照情報" description="このセクションは readOnly です。">
        <div className="mb-4 flex justify-end">
          <SettingReadOnlyBadge />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { label: "操作マニュアル", value: "準備中" },
            { label: "よくある質問", value: "準備中" },
            { label: "障害時連絡先", value: "管理者へ確認" },
            { label: "利用規約", value: "準備中" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>
      </SettingSection>
    </SettingPageLayout>
  );
}
