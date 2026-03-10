import { LockClosedIcon, MegaphoneIcon, ServerStackIcon, SwatchIcon } from "@heroicons/react/24/solid";

import { SettingCard } from "@/components/settings/SettingCard";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingSection } from "@/components/settings/SettingSection";

const cards = [
  {
    title: "システム設定",
    description: "メンテナンス表示や基本設定に関わる管理項目を確認できます。",
    Icon: ServerStackIcon,
  },
  {
    title: "セキュリティ設定",
    description: "セッションや認可ポリシーなど、保護に関わる設定項目を確認できます。",
    Icon: LockClosedIcon,
  },
  {
    title: "通知ポリシー",
    description: "ロール別通知や一括通知の方針を確認できます。",
    Icon: MegaphoneIcon,
  },
  {
    title: "マスタ設定",
    description: "診療科目やテンプレートなど、運用で使う基本マスタを確認できます。",
    Icon: SwatchIcon,
  },
] as const;

export default function AdminSettingsPage() {
  return (
    <SettingPageLayout
      eyebrow="ADMIN SETTINGS"
      title="設定"
      description="管理者向けの設定画面です。現状は設定カテゴリの整理を優先し、個別ページは段階的に拡張します。"
    >
      <SettingSection
        title="設定カテゴリ"
        description="管理者として確認する主要カテゴリをカード形式で整理しています。"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((card) => (
            <SettingCard key={card.title} className="border-slate-200 bg-white">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
                  <card.Icon className="h-6 w-6" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold text-slate-900">{card.title}</h2>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">準備中</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
                </div>
              </div>
            </SettingCard>
          ))}
        </div>
      </SettingSection>
    </SettingPageLayout>
  );
}
