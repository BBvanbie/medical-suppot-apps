import {
  BellAlertIcon,
  BuildingOffice2Icon,
  ComputerDesktopIcon,
  LifebuoyIcon,
  RectangleStackIcon,
} from "@heroicons/react/24/solid";

import { SettingsOverviewPage } from "@/components/settings/SettingsOverviewPage";
import { getHospitalSettingsProfile } from "@/lib/settingsProfiles";

const cards = [
  {
    href: "/hp/settings/facility",
    eyebrow: "FACILITY",
    title: "施設情報",
    description: "正式名称や基本情報を確認し、運用用の補足情報を整理できます。",
    icon: BuildingOffice2Icon,
  },
  {
    href: "/hp/settings/operations",
    eyebrow: "OPERATIONS",
    title: "運用設定",
    description: "テンプレートや受入運用に関する設定を、現場運用に合わせて管理できます。",
    icon: RectangleStackIcon,
  },
  {
    href: "/hp/settings/notifications",
    eyebrow: "NOTIFICATIONS",
    title: "通知設定",
    description: "院内向け通知の受信条件や見え方を用途に応じて調整できます。",
    icon: BellAlertIcon,
  },
  {
    href: "/hp/settings/display",
    eyebrow: "DISPLAY",
    title: "表示設定",
    description: "一覧表示や強調表示など、日々の確認作業で使う表示条件を調整できます。",
    icon: ComputerDesktopIcon,
  },
  {
    href: "/hp/settings/support",
    eyebrow: "SUPPORT",
    title: "サポート",
    description: "マニュアルや連絡先など、運用支援に必要な情報を参照できます。",
    icon: LifebuoyIcon,
  },
] as const;

export default async function HospitalSettingsPage() {
  const profile = await getHospitalSettingsProfile();

  return (
    <SettingsOverviewPage
      eyebrow="HOSPITAL SETTINGS"
      title="設定"
      description="病院向けの設定画面です。施設情報、運用設定、通知、表示条件を用途別に整理しています。"
      tone="hospital"
      heroCards={[
        {
          label: "FACILITY",
          title: profile?.hospitalName ?? "未設定",
          description: `施設コード: ${profile?.facilityCode ?? "-"}`,
          toneClassName: "text-emerald-600",
        },
        {
          label: "CONTACT",
          title: profile?.phone || "未登録",
          description: profile?.municipality || "自治体未設定",
          toneClassName: "text-emerald-600",
        },
        {
          label: "POLICY",
          title: "施設情報は mixed 権限",
          description: "正式名称や施設コードは参照のみ、連絡先や補足文などは後続で編集可能にします。",
          toneClassName: "text-emerald-600",
        },
      ]}
      linkSectionTitle="設定カテゴリ"
      linkSectionDescription="病院運用に必要な範囲だけを設定として切り出しています。"
      cards={[...cards]}
    />
  );
}
