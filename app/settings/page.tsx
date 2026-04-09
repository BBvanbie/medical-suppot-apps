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

const cards = [
  {
    href: "/settings/mode",
    eyebrow: "モード",
    title: "運用モード",
    description: "LIVE と TRAINING の表示対象を切り替えます。訓練モード中のみ training 事案を作成できます。",
    icon: SignalIcon,
  },
  {
    href: "/settings/device",
    eyebrow: "端末",
    title: "端末情報",
    description: "使用中の端末、ログイン情報、ロール情報など、現在の利用環境に関する基本情報を確認できます。",
    icon: DevicePhoneMobileIcon,
  },
  {
    href: "/change-password",
    eyebrow: "認証",
    title: "パスワード変更",
    description: "現在のパスワードを確認し、新しいパスワードへ変更します。一時パスワード発行後の変更もここで行います。",
    icon: LockClosedIcon,
  },
  {
    href: "/settings/sync",
    eyebrow: "同期",
    title: "同期設定",
    description: "通信状態や最新同期時刻を確認し、必要に応じて手動同期や未送信データの再送を実行できます。",
    icon: SignalIcon,
  },
  {
    href: "/settings/offline-queue",
    eyebrow: "オフライン",
    title: "未送信キュー",
    description: "オフライン中に保留された送信操作や未送信項目を確認し、競合や送信待ちの内容を整理できます。",
    icon: ArchiveBoxArrowDownIcon,
  },
  {
    href: "/settings/notifications",
    eyebrow: "通知",
    title: "通知設定",
    description: "新着通知の受け取り方法や、通知音の有無などを用途に応じて調整できます。",
    icon: BellAlertIcon,
  },
  {
    href: "/settings/display",
    eyebrow: "表示",
    title: "表示設定",
    description: "文字サイズや一覧表示の密度を調整し、現場で見やすい画面に変更できます。",
    icon: ComputerDesktopIcon,
  },
  {
    href: "/settings/input",
    eyebrow: "入力",
    title: "入力補助",
    description: "入力時の補助設定やアシスト機能の利用方針を調整できます。",
    icon: WrenchScrewdriverIcon,
  },
  {
    href: "/settings/support",
    eyebrow: "サポート",
    title: "サポート",
    description: "マニュアルや問い合わせ先など、運用時に確認したい情報を参照できます。",
    icon: LifebuoyIcon,
  },
] as const;

export default async function SettingsPage() {
  const user = await getAuthenticatedUser();
  const profile = await getEmsSettingsProfile();

  return (
    <SettingsOverviewPage
      eyebrow="設定"
      title="設定"
      description="救急隊向けの各種設定をまとめています。端末情報、同期、通知、表示、入力補助を用途別に確認できます。"
      tone="ems"
      heroCards={[
        {
          label: "所属",
          title: profile?.teamName ?? "未設定",
          description: `隊コード: ${profile?.teamCode ?? "-"}`,
          toneClassName: "text-blue-600",
        },
        {
          label: "状態",
          title: getAppModeLabel(user?.currentMode ?? "LIVE"),
          description: `最終ログイン: ${profile?.lastLoginAt ?? "記録なし"}`,
          toneClassName: "text-blue-600",
          badge: user?.currentMode === "TRAINING" ? "訓練表示中" : "本番表示中",
        },
        {
          label: "権限",
          title: "救急隊設定の閲覧と更新",
          description: "端末情報の確認、通知・表示・入力補助の調整が行えます。",
          toneClassName: "text-blue-600",
          badge: "一部設定のみ",
        },
      ]}
      linkSectionTitle="設定カテゴリ"
      linkSectionDescription="用途別に分かれた設定画面へ移動できます。必要な項目から順に確認してください。"
      cards={[...cards]}
      summarySectionTitle="現在のサマリー"
      summarySectionDescription="日常運用で確認頻度の高い基本情報をまとめています。"
      summaryItems={[
        { label: "所属隊", value: profile?.division ?? "-" },
        { label: "アカウント", value: profile?.displayName ?? "-" },
        { label: "ロール", value: profile?.role ?? "EMS" },
        { label: "表示モード", value: getAppModeLabel(user?.currentMode ?? "LIVE") },
        { label: "入力補助", value: "有効" },
      ]}
    />
  );
}
