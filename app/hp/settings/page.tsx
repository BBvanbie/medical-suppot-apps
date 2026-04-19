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

type HospitalSettingCard = {
  eyebrow: string;
  title: string;
  description: string;
  Icon: typeof RectangleStackIcon;
  href: string;
};

const cards: HospitalSettingCard[] = [
  { eyebrow: "DEVICE", title: "端末情報", description: "現在利用中の病院端末の登録状態、WebAuthn MFA、基本情報を確認できます。", Icon: DevicePhoneMobileIcon, href: "/hp/settings/device" },
  { eyebrow: "MODE", title: "運用モード", description: "LIVE と TRAINING の表示対象を切り替えます。TRAINING 中は訓練案件だけを閲覧・応答できます。", Icon: RectangleStackIcon, href: "/hp/settings/mode" },
  { eyebrow: "FACILITY", title: "施設情報", description: "正式名称や基本情報を確認し、運用用の補足情報を整理できます。", Icon: BuildingOffice2Icon, href: "/hp/settings/facility" },
  { eyebrow: "OPERATIONS", title: "運用設定", description: "テンプレートや受入運用に関する設定を、現場運用に合わせて管理できます。", Icon: RectangleStackIcon, href: "/hp/settings/operations" },
  { eyebrow: "NOTIFY", title: "通知設定", description: "院内向け通知の受信条件や見え方を用途に応じて調整できます。", Icon: BellAlertIcon, href: "/hp/settings/notifications" },
  { eyebrow: "DISPLAY", title: "表示設定", description: "一覧表示や強調表示など、日々の確認作業で使う表示条件を調整できます。", Icon: ComputerDesktopIcon, href: "/hp/settings/display" },
  { eyebrow: "PASSWORD", title: "パスワード変更", description: "現在のパスワードを確認し、新しいパスワードへ変更します。", Icon: LockClosedIcon, href: "/change-password" },
  { eyebrow: "SUPPORT", title: "サポート", description: "マニュアルや連絡先など、運用支援に必要な情報を参照できます。", Icon: LifebuoyIcon, href: "/hp/settings/support" },
] as const;

export default async function HospitalSettingsPage() {
  const user = await getAuthenticatedUser();
  const profile = await getHospitalSettingsProfile();

  return (
    <SettingsOverviewPage
      eyebrow="HOSPITAL SETTINGS"
      title="設定"
      description="病院向けの設定画面です。施設情報、運用設定、通知、表示条件を同じ workbench 文法で整理しています。"
      tone="hospital"
      heroCards={[
        {
          label: "FACILITY",
          title: profile?.hospitalName ?? "未設定",
          description: `施設コード ${profile?.facilityCode ?? "-"} を基準に、病院向け設定と端末情報を整理します。`,
          toneClassName: "text-emerald-600",
        },
        {
          label: "MODE",
          title: getAppModeLabel(user?.currentMode ?? "LIVE"),
          description: user?.currentMode === "TRAINING" ? "訓練表示中です。TRAINING 案件だけを閲覧・応答できます。" : "本番表示中です。院内運用と通知は LIVE データを基準にします。",
          toneClassName: "text-emerald-600",
          badge: "現在モード",
        },
        {
          label: "MUNICIPALITY / POLICY",
          title: profile?.municipality || "-",
          description: `${profile?.role ?? "HOSPITAL"} として利用中です。施設コードは参照中心、補足情報は運用設定で調整します。`,
          toneClassName: "text-emerald-600",
        },
      ]}
      linkSectionTitle="設定カテゴリ"
      linkSectionDescription="病院運用に必要な範囲だけを設定として切り出しています。"
      cards={cards.map(({ Icon, ...card }) => ({ ...card, icon: Icon, statusLabel: "利用可能" }))}
      summarySectionTitle="現在の利用状況"
      summarySectionDescription="施設単位で確認したい前提情報を、設定に入る前にまとめています。"
      summaryItems={[
        { label: "facility", value: profile?.hospitalName ?? "未設定" },
        { label: "mode", value: getAppModeLabel(user?.currentMode ?? "LIVE") },
        { label: "municipality", value: profile?.municipality || "-" },
        { label: "role", value: profile?.role ?? "HOSPITAL" },
      ]}
    />
  );
}
