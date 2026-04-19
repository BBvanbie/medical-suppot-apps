import { Cog6ToothIcon, LifebuoyIcon, RectangleStackIcon, SignalIcon } from "@heroicons/react/24/solid";

import { SettingsOverviewPage } from "@/components/settings/SettingsOverviewPage";
import { getAppModeLabel } from "@/lib/appMode";
import { getAuthenticatedUser } from "@/lib/authContext";

type DispatchSettingCard = {
  eyebrow: string;
  title: string;
  description: string;
  Icon: typeof RectangleStackIcon;
  href?: string;
  statusLabel?: string;
};

const cards: DispatchSettingCard[] = [
  {
    eyebrow: "MODE",
    title: "運用モード",
    description: "LIVE と TRAINING の表示対象を切り替えます。指令一覧と起票対象は現在モードだけに固定します。",
    Icon: RectangleStackIcon,
    href: "/dispatch/settings/mode",
  },
  {
    eyebrow: "GUIDE",
    title: "訓練 / デモ資料",
    description: "開始前確認、簡易フロー、注意点、FAQ を確認できます。指令 role 向けの運用メモをここに集約します。",
    Icon: LifebuoyIcon,
    href: "/dispatch/settings/support",
  },
  {
    eyebrow: "CREATE",
    title: "指令起票",
    description: "現在モードのまま指令起票へ進み、EMS 側へ渡す案件を新規作成します。",
    Icon: Cog6ToothIcon,
    href: "/dispatch/new",
  },
  {
    eyebrow: "CASES",
    title: "指令一覧",
    description: "起票済み案件を現在モードだけで確認します。訓練中は TRAINING 案件だけを表示します。",
    Icon: SignalIcon,
    href: "/dispatch/cases",
  },
] as const;

export default async function DispatchSettingsPage() {
  const user = await getAuthenticatedUser();

  return (
    <SettingsOverviewPage
      eyebrow="DISPATCH SETTINGS"
      title="設定"
      description="指令向けの設定画面です。admin 設定と同じ workbench 文法で、mode 切替、資料、一覧導線をまとめています。"
      tone="dispatch"
      heroCards={[
        {
          label: "CATEGORIES",
          title: String(cards.length),
          description: "指令 role で使う mode、資料、起票、一覧導線だけに絞って整理しています。",
          toneClassName: "text-amber-600",
        },
        {
          label: "MODE",
          title: getAppModeLabel(user?.currentMode ?? "LIVE"),
          description: "現在の表示 / 起票対象モードです。指令一覧と新規起票はこのモードだけを扱います。",
          toneClassName: "text-amber-600",
          badge: "現在モード",
        },
        {
          label: "TRAINING / MFA",
          title: user?.currentMode === "TRAINING" ? "TRAINING 起票可" : "LIVE 運用中",
          description: "DISPATCH は現行方針で MFA 対象外です。TRAINING 時だけ訓練案件を起票できます。",
          toneClassName: "text-amber-600",
        },
      ]}
      linkSectionTitle="設定カテゴリ"
      linkSectionDescription="指令 role で確認する主要カテゴリを admin と同じ workbench 文法で整理しています。"
      cards={cards.map(({ Icon, statusLabel, ...card }) => ({
        ...card,
        icon: Icon,
        statusLabel: statusLabel ?? (card.href ? "利用可能" : "準備中"),
      }))}
      summarySectionTitle="現在の利用状況"
      summarySectionDescription="起票と監視の前提になる mode と利用範囲を先に確認します。"
      summaryItems={[
        { label: "categories", value: String(cards.length) },
        { label: "mode", value: getAppModeLabel(user?.currentMode ?? "LIVE") },
        { label: "training create", value: user?.currentMode === "TRAINING" ? "有効" : "無効" },
        { label: "mfa", value: "対象外" },
      ]}
    />
  );
}
