import Link from "next/link";
import {
  ArchiveBoxArrowDownIcon,
  BellAlertIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  LifebuoyIcon,
  LockClosedIcon,
  SignalIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/solid";

import { AdminWorkbenchMetric, AdminWorkbenchPage, AdminWorkbenchSection } from "@/components/admin/AdminWorkbench";
import { getAppModeLabel } from "@/lib/appMode";
import { getAuthenticatedUser } from "@/lib/authContext";
import { getEmsSettingsProfile } from "@/lib/settingsProfiles";

type EmsSettingCard = {
  title: string;
  description: string;
  Icon: typeof SignalIcon;
  href: string;
};

const cards: EmsSettingCard[] = [
  { title: "運用モード", description: "LIVE と TRAINING の表示対象を切り替えます。訓練中のみ training 事案を作成できます。", Icon: SignalIcon, href: "/settings/mode" },
  { title: "端末情報", description: "使用中の端末、ログイン情報、ロール情報など、現在の利用環境を確認できます。", Icon: DevicePhoneMobileIcon, href: "/settings/device" },
  { title: "パスワード変更", description: "現在のパスワード確認と、新しいパスワードへの変更を行います。", Icon: LockClosedIcon, href: "/change-password" },
  { title: "同期設定", description: "通信状態や最新同期時刻を確認し、必要に応じて手動同期や再送を実行できます。", Icon: SignalIcon, href: "/settings/sync" },
  { title: "未送信キュー", description: "オフライン中に保留された送信操作や競合内容を整理できます。", Icon: ArchiveBoxArrowDownIcon, href: "/settings/offline-queue" },
  { title: "通知設定", description: "新着通知の受け取り方法や通知音を用途に応じて調整できます。", Icon: BellAlertIcon, href: "/settings/notifications" },
  { title: "表示設定", description: "文字サイズや一覧密度を調整し、現場で見やすい画面に変更できます。", Icon: ComputerDesktopIcon, href: "/settings/display" },
  { title: "入力補助", description: "入力時の補助設定やアシスト機能の利用方針を調整できます。", Icon: WrenchScrewdriverIcon, href: "/settings/input" },
  { title: "サポート", description: "マニュアルや問い合わせ先など、運用時に確認したい情報を参照できます。", Icon: LifebuoyIcon, href: "/settings/support" },
] as const;

export default async function SettingsPage() {
  const user = await getAuthenticatedUser();
  const profile = await getEmsSettingsProfile();

  return (
    <AdminWorkbenchPage
      eyebrow="EMS SETTINGS"
      title="設定"
      description="救急隊向けの各種設定をまとめています。端末情報、同期、通知、表示、入力補助を同じ workbench 文法で確認できます。"
      tone="ems"
      metrics={
        <>
          <AdminWorkbenchMetric label="TEAM" value={profile?.teamName ?? "未設定"} hint={`隊コード ${profile?.teamCode ?? "-"}`} tone="accent" palette="ems" />
          <AdminWorkbenchMetric label="MODE" value={getAppModeLabel(user?.currentMode ?? "LIVE")} hint={user?.currentMode === "TRAINING" ? "訓練表示中" : "本番表示中"} tone="warning" palette="ems" />
          <AdminWorkbenchMetric label="ROLE" value={profile?.role ?? "EMS"} hint={profile?.displayName ?? "-"} palette="ems" />
          <AdminWorkbenchMetric label="DIVISION" value={profile?.division ?? "-"} hint={`最終ログイン ${profile?.lastLoginAt ?? "記録なし"}`} palette="ems" />
        </>
      }
    >
      <AdminWorkbenchSection
        kicker="SETTING CATEGORIES"
        title="設定カテゴリ"
        description="用途別に分かれた設定画面へ移動できます。必要な項目から順に確認してください。"
        tone="ems"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((card) => (
            <article key={card.title} className="rounded-[24px] border border-slate-200/90 bg-slate-50/70 px-5 py-5 transition hover:border-blue-200 hover:bg-blue-50/30">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
                  <card.Icon className="h-6 w-6" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-[18px] font-bold tracking-[-0.02em] text-slate-950">{card.title}</h2>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">利用可能</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
                  <Link href={card.href} className="mt-4 inline-flex text-sm font-semibold text-blue-700 transition hover:text-blue-800">
                    この設定を開く
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </AdminWorkbenchSection>
    </AdminWorkbenchPage>
  );
}
