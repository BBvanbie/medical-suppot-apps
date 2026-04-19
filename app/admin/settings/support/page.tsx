import Link from "next/link";
import {
  BellAlertIcon,
  BookOpenIcon,
  CircleStackIcon,
  ServerStackIcon,
} from "@heroicons/react/24/solid";

import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingSection } from "@/components/settings/SettingSection";
import { requireAdminUser } from "@/lib/admin/adminPageAccess";

type SupportSection = {
  id: string;
  label: string;
  title: string;
  description: string;
  Icon: typeof BookOpenIcon;
  items: Array<{ title: string; summary: string; path: string }>;
};

const sections: SupportSection[] = [
  {
    id: "system",
    label: "SYSTEM",
    title: "システム運用資料",
    description: "監視、バックアップ、復旧、ネットワーク安全管理を確認するための資料です。",
    Icon: ServerStackIcon,
    items: [
      {
        title: "Backup / Restore Runbook",
        summary: "バックアップ記録、失敗時対応、復旧確認手順を確認します。",
        path: "docs/operations/backup-restore-runbook.md",
      },
      {
        title: "Network Security Runbook",
        summary: "接続点、FW・ACL、外部接続、例外ルールの前提を確認します。",
        path: "docs/operations/network-security-runbook.md",
      },
    ],
  },
  {
    id: "notifications",
    label: "NOTIFY",
    title: "通知 / 監視ポリシー資料",
    description: "通知の運用方針と、監視画面から確認すべきポイントを整理しています。",
    Icon: BellAlertIcon,
    items: [
      {
        title: "Current Work",
        summary: "通知 read/update query と migration の最新整理を確認します。",
        path: "docs/current-work.md",
      },
      {
        title: "DB Hardening Plan",
        summary: "通知 index、dedupe、性能計測の残課題を確認します。",
        path: "docs/plans/2026-04-14-db-hardening-implementation.md",
      },
    ],
  },
  {
    id: "master",
    label: "MASTER",
    title: "マスタ / 参照資料",
    description: "運用で使う台帳、責任分界、証跡一覧などの参照先です。",
    Icon: CircleStackIcon,
    items: [
      {
        title: "責任分界表",
        summary: "組織責任と実名版投入先の整理を確認します。",
        path: "docs/medical-safety-responsibility-matrix.md",
      },
      {
        title: "証跡一覧",
        summary: "監査や定期見直しで参照する証跡と保管責任を確認します。",
        path: "docs/medical-safety-evidence-matrix.md",
      },
    ],
  },
];

export default async function AdminSupportSettingsPage() {
  await requireAdminUser();

  return (
    <SettingPageLayout
      tone="admin"
      eyebrow="ADMIN SETTINGS"
      title="運用資料"
      description="Admin が監視、通知、マスタ運用で参照する runbook と整理資料の入口です。"
      sectionLabel="サポート"
      heroNote="専用編集画面がない領域でも、まずここから runbook と方針文書へ入れるようにしています。"
    >
      {sections.map((section) => (
        <SettingSection
          key={section.id}
          tone="admin"
          title={section.title}
          description={section.description}
        >
          <div id={section.id} className="grid gap-4 md:grid-cols-2">
            {section.items.map((item) => (
              <article key={item.path} className="rounded-[24px] border border-orange-100/80 bg-orange-50/35 px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-orange-100 p-3 text-orange-700">
                    <section.Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold tracking-[0.16em] text-orange-700">{section.label}</p>
                    <h2 className="mt-2 text-base font-bold text-slate-950">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.summary}</p>
                    <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-slate-600">{item.path}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </SettingSection>
      ))}

      <SettingSection
        tone="admin"
        title="関連導線"
        description="画面側で先に確認したいときの入口です。"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Link
            href="/admin/settings/system"
            className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 px-4 py-4 text-sm font-semibold text-slate-900 transition hover:border-orange-200 hover:bg-orange-50/50"
          >
            システム設定ページを開く
            <p className="mt-2 text-xs font-normal leading-5 text-slate-500">DB 状態、バックアップ、runbook への次導線を画面上で確認します。</p>
          </Link>
          <Link
            href="/admin/settings/notifications"
            className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 px-4 py-4 text-sm font-semibold text-slate-900 transition hover:border-orange-200 hover:bg-orange-50/50"
          >
            通知ポリシーページを開く
            <p className="mt-2 text-xs font-normal leading-5 text-slate-500">通知件数、未読量、failure source の要約を確認します。</p>
          </Link>
          <Link
            href="/admin/settings/master"
            className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 px-4 py-4 text-sm font-semibold text-slate-900 transition hover:border-orange-200 hover:bg-orange-50/50"
          >
            マスタ設定ページを開く
            <p className="mt-2 text-xs font-normal leading-5 text-slate-500">病院、隊、診療科、責任分界資料の正本をまとめて確認します。</p>
          </Link>
          <Link
            href="/admin/monitoring"
            className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 px-4 py-4 text-sm font-semibold text-slate-900 transition hover:border-orange-200 hover:bg-orange-50/50"
          >
            監視 workbench を開く
            <p className="mt-2 text-xs font-normal leading-5 text-slate-500">DB、通知失敗、バックアップ成否、security signal を同じ画面で確認します。</p>
          </Link>
          <Link
            href="/admin/settings/security"
            className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 px-4 py-4 text-sm font-semibold text-slate-900 transition hover:border-orange-200 hover:bg-orange-50/50"
          >
            認証 / 端末運用資料を開く
            <p className="mt-2 text-xs font-normal leading-5 text-slate-500">ID、username、端末登録、紛失時の再開手順を確認します。</p>
          </Link>
        </div>
      </SettingSection>
    </SettingPageLayout>
  );
}
