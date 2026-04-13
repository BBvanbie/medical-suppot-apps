import Link from "next/link";
import { Cog6ToothIcon, LifebuoyIcon, RectangleStackIcon, SignalIcon } from "@heroicons/react/24/solid";

import { AdminWorkbenchMetric, AdminWorkbenchPage, AdminWorkbenchSection } from "@/components/admin/AdminWorkbench";
import { getAppModeLabel } from "@/lib/appMode";
import { getAuthenticatedUser } from "@/lib/authContext";

type DispatchSettingCard = {
  title: string;
  description: string;
  Icon: typeof RectangleStackIcon;
  href?: string;
};

const cards: DispatchSettingCard[] = [
  {
    title: "運用モード",
    description: "LIVE と TRAINING の表示対象を切り替えます。指令一覧と起票対象は現在モードだけに固定します。",
    Icon: RectangleStackIcon,
    href: "/dispatch/settings/mode",
  },
  {
    title: "訓練 / デモ資料",
    description: "開始前確認、簡易フロー、注意点、FAQ を確認できます。指令 role 向けの運用メモをここに集約します。",
    Icon: LifebuoyIcon,
    href: "/dispatch/settings/support",
  },
  {
    title: "指令起票",
    description: "現在モードのまま指令起票へ進み、EMS 側へ渡す案件を新規作成します。",
    Icon: Cog6ToothIcon,
    href: "/dispatch/new",
  },
  {
    title: "指令一覧",
    description: "起票済み案件を現在モードだけで確認します。訓練中は TRAINING 案件だけを表示します。",
    Icon: SignalIcon,
    href: "/dispatch/cases",
  },
] as const;

export default async function DispatchSettingsPage() {
  const user = await getAuthenticatedUser();

  return (
    <AdminWorkbenchPage
      eyebrow="DISPATCH SETTINGS"
      title="設定"
      description="指令向けの設定画面です。admin 設定と同じ workbench 文法で、mode 切替、資料、一覧導線をまとめています。"
      tone="dispatch"
      metrics={
        <>
          <AdminWorkbenchMetric label="CATEGORIES" value={cards.length} hint="利用可能カテゴリ数" tone="accent" palette="dispatch" />
          <AdminWorkbenchMetric label="MODE" value={getAppModeLabel(user?.currentMode ?? "LIVE")} hint="現在の表示 / 起票対象モード" tone="warning" palette="dispatch" />
          <AdminWorkbenchMetric label="TRAINING CREATE" value={user?.currentMode === "TRAINING" ? "有効" : "無効"} hint="TRAINING 起票可否" palette="dispatch" />
          <AdminWorkbenchMetric label="MFA" value="対象外" hint="DISPATCH は現行方針で MFA 対象外" palette="dispatch" />
        </>
      }
    >
      <AdminWorkbenchSection
        kicker="SETTING CATEGORIES"
        title="設定カテゴリ"
        description="指令 role で確認する主要カテゴリを admin と同じ workbench 文法で整理しています。"
        tone="dispatch"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((card) => (
            <article key={card.title} className="rounded-[24px] border border-slate-200/90 bg-slate-50/70 px-5 py-5 transition hover:border-amber-200 hover:bg-amber-50/40">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                  <card.Icon className="h-6 w-6" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-[18px] font-bold tracking-[-0.02em] text-slate-950">{card.title}</h2>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">{card.href ? "利用可能" : "準備中"}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
                  {card.href ? (
                    <Link href={card.href} className="mt-4 inline-flex text-sm font-semibold text-amber-700 transition hover:text-amber-800">
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
