import {
  BellAlertIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  LifebuoyIcon,
  SignalIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/solid";

import { SettingCard } from "@/components/settings/SettingCard";
import { SettingLinkCard } from "@/components/settings/SettingLinkCard";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingReadOnlyBadge } from "@/components/settings/SettingReadOnlyBadge";
import { SettingSection } from "@/components/settings/SettingSection";
import { getEmsSettingsProfile } from "@/lib/settingsProfiles";

const cards = [
  {
    href: "/settings/device",
    eyebrow: "DEVICE",
    title: "端末情報",
    description: "所属隊・端末識別・ログイン情報など、現在端末の基本情報を確認します。",
    icon: DevicePhoneMobileIcon,
  },
  {
    href: "/settings/sync",
    eyebrow: "SYNC",
    title: "同期",
    description: "通信状態や最終同期時刻を確認し、再試行系の入口をまとめます。",
    icon: SignalIcon,
  },
  {
    href: "/settings/notifications",
    eyebrow: "NOTIFICATIONS",
    title: "通知設定",
    description: "新着通知や再通知など、運用時に必要な通知条件を調整します。",
    icon: BellAlertIcon,
  },
  {
    href: "/settings/display",
    eyebrow: "DISPLAY",
    title: "表示設定",
    description: "文字サイズや一覧の見やすさなど、表示体験を調整します。",
    icon: ComputerDesktopIcon,
  },
  {
    href: "/settings/input",
    eyebrow: "INPUT",
    title: "入力補助",
    description: "入力時の補助設定やアシスト挙動を確認します。",
    icon: WrenchScrewdriverIcon,
  },
  {
    href: "/settings/support",
    eyebrow: "SUPPORT",
    title: "サポート",
    description: "マニュアルや連絡先など、参照専用の情報をまとめます。",
    icon: LifebuoyIcon,
  },
] as const;

export default async function SettingsPage() {
  const profile = await getEmsSettingsProfile();

  return (
    <SettingPageLayout
      eyebrow="EMS SETTINGS"
      title="設定"
      description="救急隊向けの設定画面です。端末状態の確認と、通知・表示・入力補助の調整を役割ごとに分けています。"
    >
      <section className="grid gap-4 xl:grid-cols-3">
        <SettingCard className="border-slate-200 bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">TEAM</p>
          <p className="mt-3 text-xl font-bold text-slate-900">{profile?.teamName ?? "未所属"}</p>
          <p className="mt-2 text-sm text-slate-500">隊コード: {profile?.teamCode ?? "-"}</p>
        </SettingCard>
        <SettingCard className="border-slate-200 bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">STATUS</p>
          <p className="mt-3 text-xl font-bold text-slate-900">オンライン</p>
          <p className="mt-2 text-sm text-slate-500">最終ログイン: {profile?.lastLoginAt ?? "不明"}</p>
        </SettingCard>
        <SettingCard className="border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">PERMISSION</p>
              <p className="mt-3 text-sm font-semibold text-slate-900">閲覧中心 + 一部設定変更</p>
            </div>
            <SettingReadOnlyBadge>一部閲覧のみ</SettingReadOnlyBadge>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">端末情報や状態サマリーは閲覧のみ、通知・表示・入力補助は調整可能な構成です。</p>
        </SettingCard>
      </section>

      <SettingSection title="設定カテゴリ" description="用途別に分けているため、短時間で目的の設定へ移動できます。">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <SettingLinkCard key={card.href} {...card} tone="ems" />
          ))}
        </div>
      </SettingSection>

      <SettingSection title="状態サマリー" description="日常運用で確認頻度の高い項目だけを先にまとめています。">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "所属部", value: profile?.division ?? "-" },
            { label: "アカウント", value: profile?.displayName ?? "-" },
            { label: "ロール", value: profile?.role ?? "EMS" },
            { label: "入力補助", value: "有効" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>
      </SettingSection>
    </SettingPageLayout>
  );
}
