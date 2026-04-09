import Link from "next/link";
import { LockClosedIcon, MegaphoneIcon, RectangleStackIcon, ServerStackIcon, SignalIcon, SwatchIcon } from "@heroicons/react/24/solid";

import { AdminWorkbenchMetric, AdminWorkbenchPage, AdminWorkbenchSection } from "@/components/admin/AdminWorkbench";
import { getAppModeLabel } from "@/lib/appMode";
import { getAuthenticatedUser } from "@/lib/authContext";

type AdminSettingCard = {
  title: string;
  description: string;
  Icon: (typeof RectangleStackIcon);
  href?: string;
};

const cards: AdminSettingCard[] = [
  {
    title: "運用モード",
    description: "LIVE と TRAINING の表示対象を切り替えます。管理者も同時表示ではなくモード切替で監視します。",
    Icon: RectangleStackIcon,
    href: "/admin/settings/mode",
  },
  {
    title: "システム設定",
    description: "メンテナンス表示や基本設定に関わる管理項目を確認できます。",
    Icon: ServerStackIcon,
  },
  {
    title: "監視 / バックアップ",
    description: "アプリ生存、DB接続、通知失敗、バックアップ状態を監視します。",
    Icon: SignalIcon,
    href: "/admin/monitoring",
  },
  {
    title: "セキュリティ設定",
    description: "ID と username の違い、端末登録、紛失時引継ぎ、保護方針を資料として確認できます。",
    Icon: LockClosedIcon,
    href: "/admin/settings/security",
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

export default async function AdminSettingsPage() {
  const user = await getAuthenticatedUser();

  return (
    <AdminWorkbenchPage
      eyebrow="ADMIN SETTINGS"
      title="設定"
      description="管理者向けの設定画面です。現状は設定カテゴリの整理を優先し、個別ページは段階的に拡張します。"
      metrics={
        <>
          <AdminWorkbenchMetric label="CATEGORIES" value={cards.length} hint="整理済みカテゴリ数" tone="accent" />
          <AdminWorkbenchMetric label="MODE" value={getAppModeLabel(user?.currentMode ?? "LIVE")} hint="現在の監視対象モード" tone="warning" />
          <AdminWorkbenchMetric label="SYSTEM" value="準備中" hint="メンテナンス表示と基本設定" />
          <AdminWorkbenchMetric label="SECURITY" value="準備中" hint="セッションと認可ポリシー" />
          <AdminWorkbenchMetric label="NOTIFY / MASTER" value="準備中" hint="通知方針と運用マスタ" />
        </>
      }
    >
      <AdminWorkbenchSection kicker="SETTING CATEGORIES" title="設定カテゴリ" description="管理者として確認する主要カテゴリを workbench 文法で整理しています。">
        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((card) => (
            <article key={card.title} className="rounded-[24px] border border-slate-200/90 bg-slate-50/70 px-5 py-5 transition hover:border-orange-200 hover:bg-orange-50/40">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-orange-100 p-3 text-orange-700">
                  <card.Icon className="h-6 w-6" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-[18px] font-bold tracking-[-0.02em] text-slate-950">{card.title}</h2>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">{card.href ? "利用可能" : "準備中"}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
                  {card.href ? (
                    <Link href={card.href} className="mt-4 inline-flex text-sm font-semibold text-orange-700 transition hover:text-orange-800">
                      この設定を開く
                    </Link>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </AdminWorkbenchSection>
    </AdminWorkbenchPage>
  );
}
