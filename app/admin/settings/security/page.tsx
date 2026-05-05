import {
  ArrowPathIcon,
  CheckCircleIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  ExclamationTriangleIcon,
  IdentificationIcon,
  KeyIcon,
  LockClosedIcon,
  PhoneIcon,
  PlayCircleIcon,
  ServerStackIcon,
  ShieldCheckIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/solid";

import { AdminWorkbenchMetric, AdminWorkbenchSection } from "@/components/admin/AdminWorkbench";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { requireAdminUser } from "@/lib/admin/adminPageAccess";
import { HOSPITAL_MFA_TEMPORARY_NOTE, isMfaRequiredForRole, isMfaTemporarilyDisabledForRole } from "@/lib/mfaPolicy";

type FlowStep = {
  title: string;
  description: string;
  Icon: typeof ShieldCheckIcon;
};

type DeviceFlowTone = "emerald" | "blue";

type DeviceFlow = {
  label: string;
  title: string;
  subtitle: string;
  target: string;
  Icon: typeof ShieldCheckIcon;
  tone: DeviceFlowTone;
  steps: {
    title: string;
    actor: string;
    description: string;
  }[];
  completion: string[];
  caution: string;
};

function FlowSteps({ steps, tone = "orange" }: { steps: FlowStep[]; tone?: "orange" | "blue" | "rose" }) {
  const toneClass =
    tone === "blue"
      ? "border-blue-100 bg-blue-50/40 text-blue-700"
      : tone === "rose"
        ? "border-rose-100 bg-rose-50/40 text-rose-700"
        : "border-orange-100 bg-orange-50/40 text-orange-700";

  return (
    <div className="grid gap-3 lg:grid-cols-4">
      {steps.map((step, index) => (
        <article key={step.title} className="ds-radius-panel border border-slate-200/90 bg-white px-4 py-4 ds-shadow-section-soft">
          <div className="flex items-start justify-between gap-3">
            <div className={["flex h-10 w-10 items-center justify-center rounded-2xl border", toneClass].join(" ")}>
              <step.Icon className="h-5 w-5" aria-hidden />
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 ds-text-xs-compact font-semibold text-slate-500">
              STEP {index + 1}
            </span>
          </div>
          <h3 className="mt-4 ds-text-lg-compact font-bold ds-track-title text-slate-950">{step.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
        </article>
      ))}
    </div>
  );
}

function DeviceRegistrationFlowCard({ flow }: { flow: DeviceFlow }) {
  const toneClass =
    flow.tone === "emerald"
      ? {
          shell: "border-emerald-100 bg-emerald-50/35",
          icon: "border-emerald-100 bg-emerald-100 text-emerald-700",
          badge: "bg-emerald-600 text-white",
          line: "bg-emerald-200",
          step: "border-emerald-100 bg-white",
          actor: "bg-emerald-50 text-emerald-700",
          done: "bg-emerald-50 text-emerald-800",
        }
      : {
          shell: "border-blue-100 bg-blue-50/35",
          icon: "border-blue-100 bg-blue-100 text-blue-700",
          badge: "bg-blue-600 text-white",
          line: "bg-blue-200",
          step: "border-blue-100 bg-white",
          actor: "bg-blue-50 text-blue-700",
          done: "bg-blue-50 text-blue-800",
        };

  return (
    <article className={`overflow-hidden ds-radius-hero border ${toneClass.shell}`}>
      <div className="grid gap-4 px-5 py-5 ds-grid-lg-security-detail">
        <div className="flex min-w-0 flex-col justify-between gap-5">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className={`flex h-14 w-14 items-center justify-center ds-radius-section border ${toneClass.icon}`}>
                <flow.Icon className="h-7 w-7" aria-hidden />
              </div>
              <span className={`rounded-full px-3 py-1 ds-text-xs-compact font-bold ds-track-label ${toneClass.badge}`}>
                {flow.label}
              </span>
            </div>
            <h3 className="mt-5 ds-text-title font-bold ds-track-display text-slate-950">{flow.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{flow.subtitle}</p>
          </div>
          <div className="ds-radius-command bg-white/85 px-4 py-4">
            <p className="ds-text-xs-compact font-semibold ds-track-eyebrow text-slate-400">対象端末</p>
            <p className="mt-2 ds-text-lg-compact font-bold text-slate-950">{flow.target}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">{flow.caution}</p>
          </div>
        </div>

        <div className="min-w-0">
          <div className="relative space-y-3">
            <div className={`absolute bottom-6 ds-left-timeline top-6 hidden w-0.5 ${toneClass.line} sm:block`} aria-hidden />
            {flow.steps.map((step, index) => (
              <div key={`${flow.label}-${step.title}`} className="relative grid gap-3 ds-grid-sm-icon-main">
                <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white">
                  {index + 1}
                </div>
                <div className={`ds-radius-command border px-4 py-3 ds-shadow-step-soft ${toneClass.step}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="ds-text-md font-bold ds-track-title text-slate-950">{step.title}</h4>
                    <span className={`rounded-full px-2.5 py-1 ds-text-xs-compact font-semibold ${toneClass.actor}`}>
                      {step.actor}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 ds-radius-command bg-white/90 px-4 py-4">
            <p className="text-sm font-bold text-slate-950">完了条件</p>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {flow.completion.map((item) => (
                <div key={item} className={`flex items-start gap-2 rounded-2xl px-3 py-3 text-sm leading-5 ${toneClass.done}`}>
                  <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function Checklist({
  title,
  items,
  tone = "slate",
}: {
  title: string;
  items: string[];
  tone?: "slate" | "blue" | "rose";
}) {
  const toneClass =
    tone === "blue"
      ? "border-blue-100 bg-blue-50/40"
      : tone === "rose"
        ? "border-rose-100 bg-rose-50/40"
        : "border-slate-200/90 bg-slate-50/70";

  return (
    <article className={`ds-radius-panel border px-5 py-5 ${toneClass}`.trim()}>
      <h3 className="ds-text-lg-compact font-bold ds-track-title text-slate-950">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

const registrationSteps: FlowStep[] = [
  {
    title: "ADMIN が用意",
    description: "ユーザー作成、一時パスワード発行、端末ロール / 所属確認、登録コード発行を行います。",
    Icon: ShieldCheckIcon,
  },
  {
    title: "利用者が初回ログイン",
    description: "EMS は iPad、HOSPITAL は PC で ID / パスワードを入力します。未登録端末なら端末登録画面へ進みます。",
    Icon: IdentificationIcon,
  },
  {
    title: "登録コード入力",
    description: "端末登録画面で 1 回限りの登録コードを入力し、正式端末として登録します。",
    Icon: KeyIcon,
  },
  {
    title: "HOSPITAL MFA 確認",
    description: "現在のローカル検証では HOSPITAL の WebAuthn MFA を一時停止しています。端末登録と端末情報確認を優先し、再開時に病院 PC で MFA を登録します。",
    Icon: LockClosedIcon,
  },
];

const lostDeviceSteps: FlowStep[] = [
  {
    title: "紛失を連絡",
    description: "利用者は所属責任者または ADMIN に、名前、ロール、端末名、最後に使った時刻を伝えます。",
    Icon: PhoneIcon,
  },
  {
    title: "アカウント停止",
    description: "ADMIN は先にアカウント停止とセッション失効を行い、紛失端末を使えない状態にします。",
    Icon: ExclamationTriangleIcon,
  },
  {
    title: "新端末を準備",
    description: "新しい iPad / PC、または予備端末を決めて、その端末向けに登録コードを発行します。",
    Icon: ComputerDesktopIcon,
  },
  {
    title: "新端末へ引継ぎ",
    description: "新端末でログインし、HOSPITAL は端末登録と端末情報確認、EMS は端末登録コード入力を行い、MFA は再開時に再登録する前提で最後に ADMIN が再開します。",
    Icon: ArrowPathIcon,
  },
];

const deviceFlows: DeviceFlow[] = [
  {
    label: "EMS iPad",
    title: "救急隊 iPad 登録フロー",
    subtitle: "現場端末は iPad でログインし、端末登録コード入力までを同じ端末で完了します。EMS は現行方針では WebAuthn MFA 対象外です。",
    target: "EMS 用 iPad / Safari またはインストール済みブラウザ",
    Icon: DevicePhoneMobileIcon,
    tone: "emerald",
    caution: "ローカル検証では PC の localhost ではなく、iPad から到達できる同じ URL を最初から最後まで使います。",
    steps: [
      {
        title: "ADMIN が EMS ユーザーを準備",
        actor: "ADMIN",
        description: "EMS 用 ID、初期または一時パスワード、対象端末、所属を確認し、必要なら登録コードを発行します。",
      },
      {
        title: "iPad でログイン",
        actor: "EMS",
        description: "iPad でログイン URL を開き、ID / パスワードを入力します。別端末で途中作業を代行しません。",
      },
      {
        title: "端末登録へ進む",
        actor: "EMS",
        description: "EMS は MFA 登録を行わず、端末登録画面で ADMIN から受け取った登録コードを入力します。",
      },
      {
        title: "再ログインで確認",
        actor: "EMS",
        description: "ログアウト後に再ログインし、業務画面へ進めれば運用開始できます。",
      },
    ],
    completion: ["設定 > 端末情報で登録済み", "WebAuthn MFA: 対象外", "同じ iPad で再ログイン成功"],
  },
  {
    label: "HP PC",
    title: "病院 PC 登録フロー",
    subtitle: "病院側は業務 PC でログインし、現在は端末登録と端末情報確認までを優先します。WebAuthn MFA はローカル検証中のため一時停止しています。",
    target: "HOSPITAL 用 PC / Chrome または Edge",
    Icon: ComputerDesktopIcon,
    tone: "blue",
    caution: "PC で登録した WebAuthn MFA は、その PC のブラウザ環境に紐づきます。共有端末では利用者管理を明確にします。",
    steps: [
      {
        title: "ADMIN が病院ユーザーを準備",
        actor: "ADMIN",
        description: "病院用 ID、初期または一時パスワード、病院所属、端末名を確認し、登録コードを発行します。",
      },
      {
        title: "PC でログイン",
        actor: "HOSPITAL",
        description: "病院 PC でログイン URL を開き、ID / パスワードを入力します。display name ではログインしません。",
      },
      {
        title: "MFA 一時停止を確認",
        actor: "HOSPITAL",
        description: "現在は病院 PC の WebAuthn MFA を一時停止しています。端末情報画面で一時停止中の表示と再開時の再登録方針を確認します。",
      },
      {
        title: "登録コードを入力",
        actor: "HOSPITAL",
        description: "端末登録画面で ADMIN から受け取った登録コードを入力し、その PC を病院の正式端末として登録します。",
      },
      {
        title: "受入要請画面を確認",
        actor: "HOSPITAL",
        description: "再ログイン後に受入要請一覧へ進み、端末情報画面で登録済み状態も確認します。",
      },
    ],
    completion: ["設定 > 端末情報で登録済み", "WebAuthn MFA: 一時停止中", "受入要請画面へ遷移可能"],
  },
];

const spareDeviceSwitchFlows: DeviceFlow[] = [
  {
    label: "EMS 予備 iPad",
    title: "紛失 / 故障時の iPad 切替",
    subtitle: "救急隊の端末が使えない場合は、古い端末認証を止めてから予備 iPad を正式端末として再登録します。",
    target: "予備 EMS iPad / 同じ救急隊アカウント",
    Icon: DevicePhoneMobileIcon,
    tone: "emerald",
    caution: "紛失端末が見つかっても、ADMIN が再開するまでは使わせません。先に停止、後から予備端末登録の順です。",
    steps: [
      {
        title: "紛失 / 故障を受け付ける",
        actor: "ADMIN",
        description: "利用者名、EMS 所属、端末名、最後に使った時刻、紛失か故障かを記録します。",
      },
      {
        title: "旧端末とセッションを止める",
        actor: "ADMIN",
        description: "対象アカウントを一時停止し、旧端末の登録状態とログインセッションを使えない状態にします。EMS は現行方針では MFA 対象外です。",
      },
      {
        title: "予備 iPad を割り当てる",
        actor: "ADMIN",
        description: "予備 iPad の端末名を決め、EMS 用の新しい登録コードを発行します。古い登録コードは使い回しません。",
      },
      {
        title: "予備 iPad でログイン",
        actor: "EMS",
        description: "予備 iPad からログイン URL を開き、ID / パスワードを入力します。別端末で作業を代行しません。",
      },
      {
        title: "登録コードを入力",
        actor: "EMS",
        description: "ADMIN から受け取った新しい登録コードを入力し、予備 iPad を正式端末として紐づけます。",
      },
      {
        title: "ADMIN が再開確認",
        actor: "ADMIN",
        description: "端末情報で登録済み、WebAuthn MFA 対象外、再ログイン成功を確認してアカウントを再開します。",
      },
    ],
    completion: ["旧端末が停止済み", "予備 iPad が登録済み", "EMS が再ログイン成功"],
  },
  {
    label: "HP 予備 PC",
    title: "紛失 / 故障時の PC 切替",
    subtitle: "病院 PC が使えない場合は、旧 PC の認証を失効させ、予備 PC で WebAuthn MFA と端末登録をやり直します。",
    target: "予備 HOSPITAL PC / 同じ病院アカウント",
    Icon: ComputerDesktopIcon,
    tone: "blue",
    caution: "共有 PC へ切り替える場合は、誰が使う端末かを先に決めます。利用者不明のまま登録しません。",
    steps: [
      {
        title: "紛失 / 故障を受け付ける",
        actor: "ADMIN",
        description: "病院名、利用者、端末名、故障内容または紛失状況、最後に使った時刻を記録します。",
      },
      {
        title: "旧 PC の認証を止める",
        actor: "ADMIN",
        description: "対象アカウントを一時停止し、旧 PC の端末登録と既存セッションを失効させます。MFA は一時停止中でも再開時のために再登録前提で扱います。",
      },
      {
        title: "予備 PC を割り当てる",
        actor: "ADMIN",
        description: "予備 PC の端末名と病院所属を確認し、HOSPITAL 用の新しい登録コードを発行します。",
      },
      {
        title: "予備 PC でログイン",
        actor: "HOSPITAL",
        description: "予備 PC からログイン URL を開き、ID / パスワードを入力します。display name は使いません。",
      },
      {
        title: "MFA 再開前提を確認",
        actor: "HOSPITAL",
        description: "現在は WebAuthn MFA を一時停止しています。予備 PC では端末登録と端末情報確認を先に行い、MFA 再開時に再登録します。",
      },
      {
        title: "登録コードを入力",
        actor: "HOSPITAL",
        description: "ADMIN から受け取った新しい登録コードを入力し、予備 PC を正式端末として登録します。",
      },
      {
        title: "受入要請画面を確認",
        actor: "ADMIN",
        description: "端末情報と受入要請画面への遷移を確認し、問題なければアカウントを再開します。",
      },
    ],
    completion: ["旧 PC が停止済み", "予備 PC が登録済み", "受入要請画面へ遷移可能"],
  },
];

export default async function AdminSecurityGuidePage() {
  await requireAdminUser();
  const hospitalMfaEnabled = isMfaRequiredForRole("HOSPITAL");
  const hospitalMfaTemporarilyDisabled = isMfaTemporarilyDisabledForRole("HOSPITAL");
  const hospitalMfaMetricHint = hospitalMfaEnabled
    ? "HOSPITAL のログイン時に必須。EMS は対象外"
    : "現状は HOSPITAL も一時停止中。EMS は対象外";
  const hospitalDeviceCompletionText = hospitalMfaEnabled ? "WebAuthn MFA: 登録済み" : "WebAuthn MFA: 一時停止中";
  const hospitalAdminCheckText = hospitalMfaEnabled ? "HOSPITAL は WebAuthn MFA 登録済み" : "HOSPITAL は WebAuthn MFA 一時停止を確認済み";

  return (
    <SettingPageLayout
      tone="admin"
      width="wide"
      eyebrow="ADMIN SETTINGS"
      title="認証 / 端末運用資料"
      description="ID と username の違い、端末登録から運用開始までの流れ、端末紛失時の新端末引継ぎを、ADMIN がそのまま案内できる形でまとめた資料ページです。"
      sectionLabel="セキュリティ設定"
      heroNote="設定トップと同じ header で、認証 / 端末運用資料を ADMIN 向けの設定導線として読み進められるようにしています。"
    >
      <section className="grid gap-3 xl:ds-grid-fluid-action">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <AdminWorkbenchMetric label="ROLES" value="EMS / HOSPITAL" hint="端末登録対象ロール" tone="accent" />
          <AdminWorkbenchMetric label="MFA" value="WebAuthn" hint={hospitalMfaMetricHint} />
          <AdminWorkbenchMetric label="RE-LOGIN" value="5時間" hint="完全再ログイン期限" tone="warning" />
          <AdminWorkbenchMetric label="TEMP PASS" value="24時間" hint="一時パスワードの有効期限" />
        </div>
        <div className="flex items-start xl:justify-end">
          <div className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">ADMIN が現場説明にそのまま使うページ</div>
        </div>
      </section>
      {hospitalMfaTemporarilyDisabled ? (
        <section className="ds-radius-panel border border-amber-200 bg-amber-50/60 px-5 py-4 text-sm leading-6 text-amber-900">
          <p className="font-semibold text-slate-950">HOSPITAL MFA は現在一時停止中</p>
          <p className="mt-2">{HOSPITAL_MFA_TEMPORARY_NOTE}</p>
        </section>
      ) : null}

      <AdminWorkbenchSection
        kicker="WORDS"
        title="まず言葉の意味を揃える"
        description="現場説明で混ざりやすい言葉を、ADMIN 向けに短く固定します。"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="ds-radius-panel border border-slate-200/90 bg-slate-50/70 px-4 py-4">
            <p className="ds-text-xs-compact font-semibold ds-track-eyebrow text-slate-400">ID</p>
            <h3 className="mt-2 ds-text-lg-compact font-bold text-slate-950">ログイン時に使う名前</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">現場説明では ID と言ってよいですが、実装上は username と同じものを指します。</p>
          </article>
          <article className="ds-radius-panel border border-slate-200/90 bg-slate-50/70 px-4 py-4">
            <p className="ds-text-xs-compact font-semibold ds-track-eyebrow text-slate-400">username</p>
            <h3 className="mt-2 ds-text-lg-compact font-bold text-slate-950">システム上の正式ログイン名</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">DB や API の内部では username と呼びます。今の運用では ID と同じです。</p>
          </article>
          <article className="ds-radius-panel border border-slate-200/90 bg-slate-50/70 px-4 py-4">
            <p className="ds-text-xs-compact font-semibold ds-track-eyebrow text-slate-400">display name</p>
            <h3 className="mt-2 ds-text-lg-compact font-bold text-slate-950">画面に見せる名称</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">ログインには使いません。病院名や表示名など、人が見るための名称です。</p>
          </article>
          <article className="ds-radius-panel border border-slate-200/90 bg-slate-50/70 px-4 py-4">
            <p className="ds-text-xs-compact font-semibold ds-track-eyebrow text-slate-400">WebAuthn MFA</p>
            <h3 className="mt-2 ds-text-lg-compact font-bold text-slate-950">ログイン時の追加本人確認</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">iPad や PC の生体認証、端末 PIN、パスキーなどを使う追加認証です。</p>
          </article>
        </div>
        <div className="mt-5 ds-radius-panel border border-slate-200/90 bg-white px-5 py-5">
          <h3 className="ds-text-lg-compact font-bold ds-track-title text-slate-950">迷いやすい点を一言で言うと</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
              <p className="font-semibold text-slate-900">ID と username</p>
              <p className="mt-1">今の運用では同じものです。ログイン時に入れる文字列を、現場では ID と呼びます。</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
              <p className="font-semibold text-slate-900">display name</p>
              <p className="mt-1">病院名や表示名です。画面には出ますが、ログインには使いません。</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
              <p className="font-semibold text-slate-900">PIN</p>
              <p className="mt-1">現段階ではログイン導線に組み込みません。MFA と PIN は別物として扱います。</p>
            </div>
          </div>
        </div>
      </AdminWorkbenchSection>

      <AdminWorkbenchSection
        kicker="DEVICE FLOW"
        title="端末別 登録フローチャート"
        description="ADMIN が現場へ案内するときは、端末ごとにこの順番を上から読めば登録完了まで進められます。"
        action={
          <div className="flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
            <PlayCircleIcon className="h-4 w-4" aria-hidden />
            HP:PC / EMS:iPad
          </div>
        }
      >
        <div className="grid gap-5">
          {deviceFlows.map((flow) => (
            <DeviceRegistrationFlowCard key={flow.label} flow={flow} />
          ))}
        </div>

        <div className="mt-5 grid gap-4 lg:ds-grid-balance">
          <article className="ds-radius-panel border border-amber-100 bg-amber-50/55 px-5 py-5">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                <ServerStackIcon className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h3 className="ds-text-lg-compact font-bold ds-track-title text-slate-950">ローカル検証時の URL 注意</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  iPad から検証するときは <code className="rounded bg-white px-1.5 py-0.5 text-xs font-semibold text-slate-800">localhost</code> ではなく、PC の IP アドレスを使った同じ URL で開始してください。
                  例: <code className="rounded bg-white px-1.5 py-0.5 text-xs font-semibold text-slate-800">http://192.168.11.14:3000/login</code>
                </p>
              </div>
            </div>
          </article>
          <article className="ds-radius-panel border border-slate-200/90 bg-white px-5 py-5">
            <h3 className="ds-text-lg-compact font-bold ds-track-title text-slate-950">ADMIN の確認順</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {["登録コードを発行済み", hospitalAdminCheckText, "端末情報で登録済み"].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700">
                  <CheckCircleIcon className="h-4 w-4 text-emerald-600" aria-hidden />
                  {item}
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              この 3 点がそろうまで、運用開始済みとは扱いません。端末紛失や端末交換時も同じ順で再確認します。
            </p>
          </article>
        </div>
      </AdminWorkbenchSection>

      <AdminWorkbenchSection
        kicker="FLOW 01"
        title="端末登録から運用開始まで"
        description="EMS iPad、HOSPITAL PC ともに、この順で説明すれば運用開始まで迷いません。"
      >
        <FlowSteps steps={registrationSteps} tone="blue" />
        <div className="mt-5 ds-radius-panel border border-blue-100 bg-blue-50/40 px-5 py-4">
          <p className="text-sm font-semibold text-slate-900">運用開始の完了条件</p>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
            <li>EMS iPad: `設定 &gt; 端末情報` で `登録済み端末` と `WebAuthn MFA: 対象外` が見える</li>
            <li>HOSPITAL PC: `設定 &gt; 端末情報` で `登録済み端末` と {hospitalDeviceCompletionText} が見える</li>
            <li>登録コードは最初の端末登録時だけ使い、毎回のログインでは使わない</li>
          </ul>
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          <Checklist
            title="ADMIN がやること"
            tone="blue"
            items={[
              "ユーザーを作成し、一時パスワードを発行する",
              "端末管理で対象端末のロールと所属を確認する",
              "登録コードを発行し、本人へ安全に伝える",
              hospitalMfaEnabled ? "登録後に HOSPITAL は MFA 登録、EMS は端末情報確認まで終わったか確認する" : "登録後に HOSPITAL は MFA 一時停止表示と端末情報確認、EMS は端末情報確認まで終わったか確認する",
            ]}
          />
          <Checklist
            title="EMS / HOSPITAL 利用者がやること"
            tone="blue"
            items={[
              "自分の端末で ID / パスワードを入力する",
              "端末登録画面で登録コードを入力する",
              hospitalMfaEnabled ? "HOSPITAL はログアウト後のログインで WebAuthn MFA を通過する" : "HOSPITAL は端末情報で MFA 一時停止中の表示を確認する",
              "設定 > 端末情報で登録済み端末と WebAuthn MFA 状態を確認する",
            ]}
          />
          <Checklist
            title="よくある勘違い"
            tone="blue"
            items={[
              hospitalMfaEnabled ? "HOSPITAL の MFA 登録と端末登録は別の確認である" : "HOSPITAL の MFA は現在一時停止中だが、端末登録とは別の運用論点として残る",
              "登録コードは毎回のログインでは使わない",
              "display name ではログインできない",
              "端末登録後はいったん再ログインに戻るのが正常",
            ]}
          />
        </div>
      </AdminWorkbenchSection>

      <AdminWorkbenchSection
        kicker="FLOW 02"
        title="端末紛失から新端末引継ぎまで"
        description="端末だけを止めるより先に、アカウント停止を正本として扱います。"
      >
        <FlowSteps steps={lostDeviceSteps} tone="rose" />
        <div className="mt-5 ds-radius-panel border border-rose-100 bg-rose-50/40 px-5 py-4">
          <p className="text-sm font-semibold text-slate-900">ADMIN が必ず確認すること</p>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
            <li>名前、ロール、端末名、最後に使った時刻を聞いたか</li>
            <li>再登録が終わる前にアカウントを再開していないか</li>
            <li>{hospitalMfaEnabled ? "新端末で WebAuthn MFA、端末登録、`設定 > 端末情報` の確認まで終わっているか" : "新端末で端末登録、`設定 > 端末情報`、MFA 再開前提の共有まで終わっているか"}</li>
          </ul>
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          <Checklist
            title="利用者がすぐ伝えること"
            tone="rose"
            items={[
              "自分の名前",
              "ロール: EMS か HOSPITAL か",
              "端末名または使っていた端末の種類",
              "最後に使った時刻と紛失場所の目安",
            ]}
          />
          <Checklist
            title="ADMIN が止める順番"
            tone="rose"
            items={[
              "本人確認",
              "アカウント停止",
              "既存セッション失効",
              "必要なら一時パスワード再発行",
            ]}
          />
          <Checklist
            title="新端末への引継ぎ手順"
            tone="rose"
            items={[
              "新しい iPad / PC を決める",
              "新端末向けに登録コードを発行する",
              "新端末でログインし登録コードを入力する",
              hospitalMfaEnabled ? "WebAuthn MFA と端末登録を完了し、端末情報で確認する" : "端末登録と端末情報確認を完了し、MFA 再開時の再登録前提を共有する",
            ]}
          />
        </div>
      </AdminWorkbenchSection>

      <AdminWorkbenchSection
        kicker="DEVICE RECOVERY"
        title="紛失 / 故障時の予備端末切替フローチャート"
        description="旧端末の認証を止め、予備端末で WebAuthn MFA と端末登録をやり直すまでの流れです。このページだけで ADMIN が案内できます。"
        action={
          <div className="flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white">
            <WrenchScrewdriverIcon className="h-4 w-4" aria-hidden />
            旧端末停止 → 予備端末登録
          </div>
        }
      >
        <div className="grid gap-5">
          {spareDeviceSwitchFlows.map((flow) => (
            <DeviceRegistrationFlowCard key={flow.label} flow={flow} />
          ))}
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          <Checklist
            title="切替前に止めるもの"
            tone="rose"
            items={[
              "旧端末の端末登録",
              "旧端末で登録した WebAuthn MFA",
              "既存ログインセッション",
              "未使用の古い登録コード",
            ]}
          />
          <Checklist
            title="切替時に新しくするもの"
            tone="rose"
            items={[
              "予備端末の端末名",
              "新しい登録コード",
              "予備端末の WebAuthn MFA",
              "予備端末での再ログイン確認",
            ]}
          />
          <Checklist
            title="再開してよい条件"
            tone="rose"
            items={[
              "旧端末が使えない状態になっている",
              "予備端末で端末情報が登録済みになっている",
              hospitalDeviceCompletionText + " が見える",
              "ロール別の業務画面へ進める",
            ]}
          />
        </div>
      </AdminWorkbenchSection>

      <AdminWorkbenchSection
        kicker="SCRIPT"
        title="ADMIN がそのまま読める案内文"
        description="電話や対面で利用者へ説明するときは、次の短い言い方を使えば伝わりやすくなります。"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="ds-radius-panel border border-slate-200/90 bg-slate-50/70 px-5 py-5">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-orange-100 p-3 text-orange-700">
                <DevicePhoneMobileIcon className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <h3 className="ds-text-xl-compact font-bold ds-track-title text-slate-950">端末登録時の説明例</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  これから使う ID は、システム内部では username と呼びますが、使う文字列は同じです。最初のログイン後に端末登録画面が出たら、
                  ADMIN から伝えた登録コードを入れてください。{hospitalMfaEnabled ? "ログアウト後のログインでは WebAuthn MFA が必要です。" : "現在のローカル検証では HOSPITAL の WebAuthn MFA は一時停止中です。"}
                  最後に 設定 &gt; 端末情報 で、登録済み端末 と {hospitalDeviceCompletionText} が出れば運用開始です。
                </p>
              </div>
            </div>
          </article>
          <article className="ds-radius-panel border border-slate-200/90 bg-slate-50/70 px-5 py-5">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-orange-100 p-3 text-orange-700">
                <ComputerDesktopIcon className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <h3 className="ds-text-xl-compact font-bold ds-track-title text-slate-950">紛失時の説明例</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  端末をなくした場合は、まず ADMIN に連絡してください。先にアカウントを停止して使えない状態にします。そのあと新しい端末か予備端末を決めて、
                  新しい登録コードを発行します。新端末でログイン、{hospitalMfaEnabled ? "WebAuthn MFA、" : ""}登録コード入力まで終わったら、最後に ADMIN が再開します。
                </p>
              </div>
            </div>
          </article>
        </div>
        <div className="mt-5 ds-radius-panel border border-slate-200/90 bg-white px-5 py-5">
          <p className="text-sm font-semibold text-slate-900">詳細文書の保存先</p>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
            <li>`docs/operations/auth-device-operations-guide.md`</li>
            <li>`docs/operations/device-registration-guide.md`</li>
            <li>`docs/operations/lost-device-runbook.md`</li>
          </ul>
        </div>
      </AdminWorkbenchSection>
    </SettingPageLayout>
  );
}
