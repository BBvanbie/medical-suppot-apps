import { ClipboardDocumentCheckIcon, LockClosedIcon, MegaphoneIcon, RectangleStackIcon, ServerStackIcon, SignalIcon, SwatchIcon } from "@heroicons/react/24/solid";

import { SettingsOverviewPage } from "@/components/settings/SettingsOverviewPage";
import { getAdminComplianceDashboardSummary } from "@/lib/admin/adminComplianceRepository";
import { requireAdminUser } from "@/lib/admin/adminPageAccess";
import { getAppModeLabel } from "@/lib/appMode";

type AdminSettingCard = {
  eyebrow: string;
  title: string;
  description: string;
  Icon: typeof RectangleStackIcon;
  href?: string;
};

const cards: AdminSettingCard[] = [
  {
    eyebrow: "MODE",
    title: "運用モード",
    description: "LIVE と TRAINING の表示対象を切り替えます。管理者も同時表示ではなくモード切替で監視します。",
    Icon: RectangleStackIcon,
    href: "/admin/settings/mode",
  },
  {
    eyebrow: "SYSTEM",
    title: "システム設定",
    description: "メンテナンス表示や基本設定に関わる管理項目を確認できます。",
    Icon: ServerStackIcon,
    href: "/admin/settings/system",
  },
  {
    eyebrow: "MONITORING",
    title: "監視 / バックアップ",
    description: "アプリ生存、DB接続、通知失敗、バックアップ状態を監視します。",
    Icon: SignalIcon,
    href: "/admin/monitoring",
  },
  {
    eyebrow: "SECURITY",
    title: "セキュリティ設定",
    description: "ID と username の違い、端末登録、紛失時引継ぎ、保護方針を資料として確認できます。",
    Icon: LockClosedIcon,
    href: "/admin/settings/security",
  },
  {
    eyebrow: "NOTIFY",
    title: "通知ポリシー",
    description: "ロール別通知や一括通知の方針を確認できます。",
    Icon: MegaphoneIcon,
    href: "/admin/settings/notifications",
  },
  {
    eyebrow: "COMPLIANCE",
    title: "ガイドライン運用記録",
    description: "棚卸、監査、restore drill、教育、委託見直しの実施記録と期限を管理します。",
    Icon: ClipboardDocumentCheckIcon,
    href: "/admin/settings/compliance",
  },
  {
    eyebrow: "MASTER",
    title: "マスタ設定",
    description: "診療科目やテンプレートなど、運用で使う基本マスタを確認できます。",
    Icon: SwatchIcon,
    href: "/admin/settings/master",
  },
] as const;

export default async function AdminSettingsPage() {
  const user = await requireAdminUser();
  const compliance = await getAdminComplianceDashboardSummary();

  return (
    <SettingsOverviewPage
      eyebrow="ADMIN SETTINGS"
      title="設定"
      description="管理者向けの設定画面です。現状は設定カテゴリの整理を優先し、個別ページは段階的に拡張します。"
      tone="admin"
      heroCards={[
        {
          label: "CATEGORIES",
          title: String(cards.length),
          description: "運用モード、監視、セキュリティを先に固め、その他は段階的に拡張します。",
          toneClassName: "text-orange-600",
        },
        {
          label: "MODE",
          title: getAppModeLabel(user.currentMode),
          description: "管理者は currentMode を切り替えて監視します。LIVE と TRAINING を同時には扱いません。",
          toneClassName: "text-orange-600",
          badge: "現在モード",
        },
        {
          label: "SYSTEM / SECURITY",
          title: "専用ページあり",
          description: "システム、通知、ガイドライン運用記録、マスタ設定は設定トップから専用ページへ入り、その先で runbook と監視導線を辿れるようにしています。",
          toneClassName: "text-orange-600",
        },
      ]}
      linkSectionTitle="設定カテゴリ"
      linkSectionDescription="管理者として確認する主要カテゴリを workbench 文法で整理しています。"
      cards={cards.map(({ Icon, ...card }) => ({
        ...card,
        icon: Icon,
        statusLabel: card.href ? "利用可能" : "準備中",
      }))}
      summarySectionTitle="現在の管理状態"
      summarySectionDescription="段階導入中の領域と、すぐ使える導線を切り分けて確認します。"
      summaryItems={[
        { label: "categories", value: String(cards.length) },
        { label: "mode", value: getAppModeLabel(user.currentMode) },
        { label: "system", value: "専用ページ" },
        { label: "compliance", value: compliance.attentionCount > 0 ? `要確認 ${compliance.attentionCount}` : "記録管理" },
      ]}
    />
  );
}
