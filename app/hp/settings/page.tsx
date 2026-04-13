import Link from "next/link";
import {
  BellAlertIcon,
  BuildingOffice2Icon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  LifebuoyIcon,
  LockClosedIcon,
  RectangleStackIcon,
} from "@heroicons/react/24/solid";

import { AdminWorkbenchMetric, AdminWorkbenchPage, AdminWorkbenchSection } from "@/components/admin/AdminWorkbench";
import { getAppModeLabel } from "@/lib/appMode";
import { getAuthenticatedUser } from "@/lib/authContext";
import { getHospitalSettingsProfile } from "@/lib/settingsProfiles";

type HospitalSettingCard = {
  title: string;
  description: string;
  Icon: typeof RectangleStackIcon;
  href: string;
};

const cards: HospitalSettingCard[] = [
  { title: "端末情報", description: "現在利用中の病院端末の登録状態、WebAuthn MFA、基本情報を確認できます。", Icon: DevicePhoneMobileIcon, href: "/hp/settings/device" },
  { title: "運用モード", description: "LIVE と TRAINING の表示対象を切り替えます。TRAINING 中は訓練案件だけを閲覧・応答できます。", Icon: RectangleStackIcon, href: "/hp/settings/mode" },
  { title: "施設情報", description: "正式名称や基本情報を確認し、運用用の補足情報を整理できます。", Icon: BuildingOffice2Icon, href: "/hp/settings/facility" },
  { title: "運用設定", description: "テンプレートや受入運用に関する設定を、現場運用に合わせて管理できます。", Icon: RectangleStackIcon, href: "/hp/settings/operations" },
  { title: "通知設定", description: "院内向け通知の受信条件や見え方を用途に応じて調整できます。", Icon: BellAlertIcon, href: "/hp/settings/notifications" },
  { title: "表示設定", description: "一覧表示や強調表示など、日々の確認作業で使う表示条件を調整できます。", Icon: ComputerDesktopIcon, href: "/hp/settings/display" },
  { title: "パスワード変更", description: "現在のパスワードを確認し、新しいパスワードへ変更します。", Icon: LockClosedIcon, href: "/change-password" },
  { title: "サポート", description: "マニュアルや連絡先など、運用支援に必要な情報を参照できます。", Icon: LifebuoyIcon, href: "/hp/settings/support" },
] as const;

export default async function HospitalSettingsPage() {
  const user = await getAuthenticatedUser();
  const profile = await getHospitalSettingsProfile();

  return (
    <AdminWorkbenchPage
      eyebrow="HOSPITAL SETTINGS"
      title="設定"
      description="病院向けの設定画面です。施設情報、運用設定、通知、表示条件を同じ workbench 文法で整理しています。"
      tone="hospital"
      metrics={
        <>
          <AdminWorkbenchMetric label="FACILITY" value={profile?.hospitalName ?? "未設定"} hint={`施設コード ${profile?.facilityCode ?? "-"}`} tone="accent" palette="hospital" />
          <AdminWorkbenchMetric label="MODE" value={getAppModeLabel(user?.currentMode ?? "LIVE")} hint={user?.currentMode === "TRAINING" ? "訓練表示中" : "本番表示中"} tone="warning" palette="hospital" />
          <AdminWorkbenchMetric label="MUNICIPALITY" value={profile?.municipality || "-"} hint={profile?.role ?? "HOSPITAL"} palette="hospital" />
          <AdminWorkbenchMetric label="POLICY" value="mixed 権限" hint="施設コードは参照中心、補足情報は運用設定で調整" palette="hospital" />
        </>
      }
    >
      <AdminWorkbenchSection
        kicker="SETTING CATEGORIES"
        title="設定カテゴリ"
        description="病院運用に必要な範囲だけを設定として切り出しています。"
        tone="hospital"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((card) => (
            <article key={card.title} className="rounded-[24px] border border-slate-200/90 bg-slate-50/70 px-5 py-5 transition hover:border-emerald-200 hover:bg-emerald-50/30">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                  <card.Icon className="h-6 w-6" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-[18px] font-bold tracking-[-0.02em] text-slate-950">{card.title}</h2>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">利用可能</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
                  <Link href={card.href} className="mt-4 inline-flex text-sm font-semibold text-emerald-700 transition hover:text-emerald-800">
                    この設定を開く
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </AdminWorkbenchSection>
    </AdminWorkbenchPage>
  );
}
