import {
  BellAlertIcon,
  BuildingOffice2Icon,
  ComputerDesktopIcon,
  LifebuoyIcon,
  RectangleStackIcon,
} from "@heroicons/react/24/solid";

import { SettingCard } from "@/components/settings/SettingCard";
import { SettingLinkCard } from "@/components/settings/SettingLinkCard";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingSection } from "@/components/settings/SettingSection";
import { getHospitalSettingsProfile } from "@/lib/settingsProfiles";

const cards = [
  {
    href: "/hp/settings/facility",
    eyebrow: "FACILITY",
    title: "施設情報",
    description: "正式情報の確認と、病院側で扱う連絡先系項目の入口です。",
    icon: BuildingOffice2Icon,
  },
  {
    href: "/hp/settings/operations",
    eyebrow: "OPERATIONS",
    title: "受入運用設定",
    description: "要相談や受入不可のテンプレートなど、運用系設定をまとめます。",
    icon: RectangleStackIcon,
  },
  {
    href: "/hp/settings/notifications",
    eyebrow: "NOTIFICATIONS",
    title: "通知設定",
    description: "病院側に必要な受信通知条件を調整します。",
    icon: BellAlertIcon,
  },
  {
    href: "/hp/settings/display",
    eyebrow: "DISPLAY",
    title: "表示設定",
    description: "一覧密度や初期表示条件など、日々の閲覧体験を整えます。",
    icon: ComputerDesktopIcon,
  },
  {
    href: "/hp/settings/support",
    eyebrow: "SUPPORT",
    title: "サポート",
    description: "マニュアルや問い合わせ先など、参照専用の情報をまとめます。",
    icon: LifebuoyIcon,
  },
] as const;

export default async function HospitalSettingsPage() {
  const profile = await getHospitalSettingsProfile();

  return (
    <SettingPageLayout
      eyebrow="HOSPITAL SETTINGS"
      title="設定"
      description="病院向けの設定画面です。施設の基本情報は参照中心、運用に必要な項目だけを設定カテゴリとして分離しています。"
    >
      <section className="grid gap-4 xl:grid-cols-3">
        <SettingCard className="border-slate-200 bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">FACILITY</p>
          <p className="mt-3 text-xl font-bold text-slate-900">{profile?.hospitalName ?? "未設定"}</p>
          <p className="mt-2 text-sm text-slate-500">施設コード: {profile?.facilityCode ?? "-"}</p>
        </SettingCard>
        <SettingCard className="border-slate-200 bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">CONTACT</p>
          <p className="mt-3 text-xl font-bold text-slate-900">{profile?.phone || "未登録"}</p>
          <p className="mt-2 text-sm text-slate-500">{profile?.municipality || "自治体未設定"}</p>
        </SettingCard>
        <SettingCard className="border-slate-200 bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">POLICY</p>
          <p className="mt-3 text-sm font-semibold text-slate-900">施設情報は mixed 権限</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">正式名称や施設コードは参照のみ、連絡先や補足文などは後続で編集可能にします。</p>
        </SettingCard>
      </section>

      <SettingSection title="設定カテゴリ" description="病院運用に必要な範囲だけを設定として切り出しています。">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <SettingLinkCard key={card.href} {...card} tone="hospital" />
          ))}
        </div>
      </SettingSection>
    </SettingPageLayout>
  );
}
