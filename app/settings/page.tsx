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

import { SettingsOverviewPage } from "@/components/settings/SettingsOverviewPage";
import { getAppModeLabel } from "@/lib/appMode";
import { getAuthenticatedUser } from "@/lib/authContext";
import { getEmsSettingsProfile } from "@/lib/settingsProfiles";

type EmsSettingCard = {
  eyebrow: string;
  title: string;
  description: string;
  Icon: typeof SignalIcon;
  href: string;
};

const cards: EmsSettingCard[] = [
  { eyebrow: "MODE", title: "運用モード", description: "LIVE と TRAINING の表示対象を切り替えます。訓練中のみ training 事案を作成できます。", Icon: SignalIcon, href: "/settings/mode" },
  { eyebrow: "DEVICE", title: "端末情報", description: "使用中の端末、ログイン情報、ロール情報など、現在の利用環境を確認できます。", Icon: DevicePhoneMobileIcon, href: "/settings/device" },
  { eyebrow: "PASSWORD", title: "パスワード変更", description: "現在のパスワード確認と、新しいパスワードへの変更を行います。", Icon: LockClosedIcon, href: "/change-password" },
  { eyebrow: "SYNC", title: "同期設定", description: "通信状態や最新同期時刻を確認し、必要に応じて手動同期や再送を実行できます。", Icon: SignalIcon, href: "/settings/sync" },
  { eyebrow: "QUEUE", title: "未送信キュー", description: "オフライン中に保留された送信操作や競合内容を整理できます。", Icon: ArchiveBoxArrowDownIcon, href: "/settings/offline-queue" },
  { eyebrow: "NOTIFY", title: "通知設定", description: "新着通知の受け取り方法や通知音を用途に応じて調整できます。", Icon: BellAlertIcon, href: "/settings/notifications" },
  { eyebrow: "DISPLAY", title: "表示設定", description: "文字サイズや一覧密度を調整し、現場で見やすい画面に変更できます。", Icon: ComputerDesktopIcon, href: "/settings/display" },
  { eyebrow: "INPUT", title: "入力補助", description: "入力時の補助設定やアシスト機能の利用方針を調整できます。", Icon: WrenchScrewdriverIcon, href: "/settings/input" },
  { eyebrow: "SUPPORT", title: "サポート", description: "マニュアルや問い合わせ先など、運用時に確認したい情報を参照できます。", Icon: LifebuoyIcon, href: "/settings/support" },
] as const;

export default async function SettingsPage() {
  const user = await getAuthenticatedUser();
  const profile = await getEmsSettingsProfile();

  return (
    <SettingsOverviewPage
      eyebrow="EMS SETTINGS"
      title="設定"
      description="救急隊向けの各種設定をまとめています。端末情報、同期、通知、表示、入力補助を同じ workbench 文法で確認できます。"
      tone="ems"
      heroCards={[
        {
          label: "TEAM",
          title: profile?.teamName ?? "未設定",
          description: `隊コード ${profile?.teamCode ?? "-"} を基準に、利用環境と role 表示を揃えます。`,
          toneClassName: "text-blue-600",
        },
        {
          label: "MODE",
          title: getAppModeLabel(user?.currentMode ?? "LIVE"),
          description: user?.currentMode === "TRAINING" ? "訓練表示中です。TRAINING 案件だけを作成・確認できます。" : "本番表示中です。通常業務の案件と通知を確認します。",
          toneClassName: "text-blue-600",
          badge: "現在モード",
        },
        {
          label: "ROLE / DIVISION",
          title: profile?.role ?? "EMS",
          description: `${profile?.displayName ?? "-"} / ${profile?.division ?? "-"} で利用中です。最終ログイン ${profile?.lastLoginAt ?? "記録なし"}`,
          toneClassName: "text-blue-600",
        },
      ]}
      linkSectionTitle="設定カテゴリ"
      linkSectionDescription="用途別に分かれた設定画面へ移動できます。必要な項目から順に確認してください。"
      cards={cards.map(({ Icon, ...card }) => ({ ...card, icon: Icon, statusLabel: "利用可能" }))}
      summarySectionTitle="現在の利用状況"
      summarySectionDescription="設定を開く前に、現在の表示対象と利用環境を一目で確認します。"
      summaryItems={[
        { label: "team", value: profile?.teamName ?? "未設定" },
        { label: "mode", value: getAppModeLabel(user?.currentMode ?? "LIVE") },
        { label: "role", value: profile?.role ?? "EMS" },
        { label: "division", value: profile?.division ?? "-" },
      ]}
    />
  );
}
