import {
  BellAlertIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  LifebuoyIcon,
  SignalIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/solid";

import { SettingsOverviewPage } from "@/components/settings/SettingsOverviewPage";
import { getEmsSettingsProfile } from "@/lib/settingsProfiles";

const cards = [
  {
    href: "/settings/device",
    eyebrow: "DEVICE",
    title: "端末情報",
    description: "使用中の端末、ログイン、ロール情報など、現在の端末に関する基本情報を確認できます。",
    icon: DevicePhoneMobileIcon,
  },
  {
    href: "/settings/sync",
    eyebrow: "SYNC",
    title: "同期",
    description: "通信状態や最新同期時刻を確認し、必要に応じて手動同期や再送を実行できます。",
    icon: SignalIcon,
  },
  {
    href: "/settings/notifications",
    eyebrow: "NOTIFICATIONS",
    title: "通知設定",
    description: "新着通知や重要通知の受信方法を、用途に応じて調整できます。",
    icon: BellAlertIcon,
  },
  {
    href: "/settings/display",
    eyebrow: "DISPLAY",
    title: "表示設定",
    description: "文字サイズや一覧表示の見え方など、日常利用向けの表示条件を調整できます。",
    icon: ComputerDesktopIcon,
  },
  {
    href: "/settings/input",
    eyebrow: "INPUT",
    title: "入力補助",
    description: "入力時の補助設定やアシスト挙動を用途別に調整できます。",
    icon: WrenchScrewdriverIcon,
  },
  {
    href: "/settings/support",
    eyebrow: "SUPPORT",
    title: "サポート",
    description: "マニュアルや問い合わせ先など、運用支援に必要な情報を参照できます。",
    icon: LifebuoyIcon,
  },
] as const;

export default async function SettingsPage() {
  const profile = await getEmsSettingsProfile();

  return (
    <SettingsOverviewPage
      eyebrow="EMS SETTINGS"
      title="設定"
      description="救急隊向けの設定画面です。端末情報、同期、通知、表示、入力補助を用途別に整理しています。"
      tone="ems"
      heroCards={[
        {
          label: "TEAM",
          title: profile?.teamName ?? "未所属",
          description: `隊コード: ${profile?.teamCode ?? "-"}`,
          toneClassName: "text-blue-600",
        },
        {
          label: "STATUS",
          title: "オンライン",
          description: `最終ログイン: ${profile?.lastLoginAt ?? "不明"}`,
          toneClassName: "text-blue-600",
        },
        {
          label: "PERMISSION",
          title: "閲覧中心 + 一部設定変更",
          description: "端末情報や状態サマリーは閲覧のみ、通知・表示・入力補助は調整可能な構成です。",
          toneClassName: "text-blue-600",
          badge: "一部閲覧のみ",
        },
      ]}
      linkSectionTitle="設定カテゴリ"
      linkSectionDescription="用途別に分けているため、短時間で目的の設定へ移動できます。"
      cards={[...cards]}
      summarySectionTitle="状態サマリー"
      summarySectionDescription="日常運用で確認頻度の高い項目だけを先にまとめています。"
      summaryItems={[
        { label: "所属部別", value: profile?.division ?? "-" },
        { label: "アカウント", value: profile?.displayName ?? "-" },
        { label: "ロール", value: profile?.role ?? "EMS" },
        { label: "入力補助", value: "有効" },
      ]}
    />
  );
}
