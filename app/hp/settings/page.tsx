import {
  BellAlertIcon,
  BuildingOffice2Icon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  LifebuoyIcon,
  LockClosedIcon,
  RectangleStackIcon,
} from "@heroicons/react/24/solid";

import { SettingsOverviewPage } from "@/components/settings/SettingsOverviewPage";
import { getAppModeLabel } from "@/lib/appMode";
import { getAuthenticatedUser } from "@/lib/authContext";
import { getHospitalSettingsProfile } from "@/lib/settingsProfiles";

const cards = [
  {
    href: "/hp/settings/device",
    eyebrow: "DEVICE",
    title: "端末情報",
    description: "現在利用中の病院端末の登録状態、WebAuthn MFA、基本情報を確認できます。",
    icon: DevicePhoneMobileIcon,
  },
  {
    href: "/hp/settings/mode",
    eyebrow: "MODE",
    title: "運用モード",
    description: "LIVE と TRAINING の表示対象を切り替えます。TRAINING 中は訓練案件だけを閲覧・応答できます。",
    icon: RectangleStackIcon,
  },
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
    href: "/change-password",
    eyebrow: "SECURITY",
    title: "パスワード変更",
    description: "現在のパスワードを確認し、新しいパスワードへ変更します。一時パスワードからの変更もここで行います。",
    icon: LockClosedIcon,
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
  const user = await getAuthenticatedUser();
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
          label: "MODE",
          title: getAppModeLabel(user?.currentMode ?? "LIVE"),
          description: profile?.municipality || "自治体未設定",
          toneClassName: "text-emerald-600",
          badge: user?.currentMode === "TRAINING" ? "訓練表示中" : "本番表示中",
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
