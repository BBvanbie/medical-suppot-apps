import {
  ArrowPathIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  ExclamationTriangleIcon,
  IdentificationIcon,
  KeyIcon,
  LockClosedIcon,
  PhoneIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/solid";

import { AdminWorkbenchMetric, AdminWorkbenchPage, AdminWorkbenchSection } from "@/components/admin/AdminWorkbench";

type FlowStep = {
  title: string;
  description: string;
  Icon: typeof ShieldCheckIcon;
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
        <article key={step.title} className="rounded-[24px] border border-slate-200/90 bg-white px-4 py-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.2)]">
          <div className="flex items-start justify-between gap-3">
            <div className={["flex h-10 w-10 items-center justify-center rounded-2xl border", toneClass].join(" ")}>
              <step.Icon className="h-5 w-5" aria-hidden />
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
              STEP {index + 1}
            </span>
          </div>
          <h3 className="mt-4 text-[16px] font-bold tracking-[-0.02em] text-slate-950">{step.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
        </article>
      ))}
    </div>
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
    <article className={`rounded-[24px] border px-5 py-5 ${toneClass}`.trim()}>
      <h3 className="text-[16px] font-bold tracking-[-0.02em] text-slate-950">{title}</h3>
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
    title: "再ログインして PIN 設定",
    description: "登録完了後はいったん再ログインへ戻り、次のログインで 6 桁 PIN を設定して運用開始です。",
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
    description: "新端末でログイン、登録コード入力、再ログイン、PIN 設定を行い、最後に ADMIN が再開します。",
    Icon: ArrowPathIcon,
  },
];

export default function AdminSecurityGuidePage() {
  return (
    <AdminWorkbenchPage
      eyebrow="ADMIN SECURITY GUIDE"
      title="認証 / 端末運用資料"
      description="ID と username の違い、端末登録から運用開始までの流れ、端末紛失時の新端末引継ぎを、ADMIN がそのまま案内できる形でまとめた資料ページです。"
      metrics={
        <>
          <AdminWorkbenchMetric label="ROLES" value="EMS / HOSPITAL" hint="端末登録対象ロール" tone="accent" />
          <AdminWorkbenchMetric label="PIN" value="6桁" hint="3時間無操作後の再開に使用" />
          <AdminWorkbenchMetric label="RE-LOGIN" value="8時間" hint="完全再ログイン期限" tone="warning" />
          <AdminWorkbenchMetric label="TEMP PASS" value="24時間" hint="一時パスワードの有効期限" />
        </>
      }
      action={<div className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">ADMIN が現場説明にそのまま使うページ</div>}
    >
      <AdminWorkbenchSection
        kicker="WORDS"
        title="まず言葉の意味を揃える"
        description="現場説明で混ざりやすい言葉を、ADMIN 向けに短く固定します。"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-[24px] border border-slate-200/90 bg-slate-50/70 px-4 py-4">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400">ID</p>
            <h3 className="mt-2 text-[16px] font-bold text-slate-950">ログイン時に使う名前</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">現場説明では ID と言ってよいですが、実装上は username と同じものを指します。</p>
          </article>
          <article className="rounded-[24px] border border-slate-200/90 bg-slate-50/70 px-4 py-4">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400">username</p>
            <h3 className="mt-2 text-[16px] font-bold text-slate-950">システム上の正式ログイン名</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">DB や API の内部では username と呼びます。今の運用では ID と同じです。</p>
          </article>
          <article className="rounded-[24px] border border-slate-200/90 bg-slate-50/70 px-4 py-4">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400">display name</p>
            <h3 className="mt-2 text-[16px] font-bold text-slate-950">画面に見せる名称</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">ログインには使いません。病院名や表示名など、人が見るための名称です。</p>
          </article>
          <article className="rounded-[24px] border border-slate-200/90 bg-slate-50/70 px-4 py-4">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400">PIN</p>
            <h3 className="mt-2 text-[16px] font-bold text-slate-950">端末ごとの 6 桁数字</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">ログイン ID の代わりではなく、3時間無操作後の再開に使う端末専用コードです。</p>
          </article>
        </div>
        <div className="mt-5 rounded-[24px] border border-slate-200/90 bg-white px-5 py-5">
          <h3 className="text-[16px] font-bold tracking-[-0.02em] text-slate-950">迷いやすい点を一言で言うと</h3>
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
              <p className="mt-1">端末登録そのものではありません。端末登録が終わったあとに、再開用として設定するものです。</p>
            </div>
          </div>
        </div>
      </AdminWorkbenchSection>

      <AdminWorkbenchSection
        kicker="FLOW 01"
        title="端末登録から運用開始まで"
        description="EMS iPad、HOSPITAL PC ともに、この順で説明すれば運用開始まで迷いません。"
      >
        <FlowSteps steps={registrationSteps} tone="blue" />
        <div className="mt-5 rounded-[24px] border border-blue-100 bg-blue-50/40 px-5 py-4">
          <p className="text-sm font-semibold text-slate-900">運用開始の完了条件</p>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
            <li>EMS iPad: `設定 &gt; 端末情報` で `登録済み端末` と `PIN: 設定済み` が見える</li>
            <li>HOSPITAL PC: `設定 &gt; 端末情報` で `登録済み端末` と `PIN: 設定済み` が見える</li>
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
              "登録後に PIN 設定と端末情報確認まで終わったか確認する",
            ]}
          />
          <Checklist
            title="EMS / HOSPITAL 利用者がやること"
            tone="blue"
            items={[
              "自分の端末で ID / パスワードを入力する",
              "端末登録画面で登録コードを入力する",
              "登録後にもう一度ログインし、6桁 PIN を設定する",
              "設定 > 端末情報で登録済み端末と PIN 設定済みを確認する",
            ]}
          />
          <Checklist
            title="よくある勘違い"
            tone="blue"
            items={[
              "PIN を入れたこと自体は端末登録完了ではない",
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
        <div className="mt-5 rounded-[24px] border border-rose-100 bg-rose-50/40 px-5 py-4">
          <p className="text-sm font-semibold text-slate-900">ADMIN が必ず確認すること</p>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
            <li>名前、ロール、端末名、最後に使った時刻を聞いたか</li>
            <li>再登録が終わる前にアカウントを再開していないか</li>
            <li>新端末で PIN 設定と `設定 &gt; 端末情報` の確認まで終わっているか</li>
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
              "再ログイン後に新しい 6桁 PIN を設定し、端末情報で確認する",
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
          <article className="rounded-[24px] border border-slate-200/90 bg-slate-50/70 px-5 py-5">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-orange-100 p-3 text-orange-700">
                <DevicePhoneMobileIcon className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <h3 className="text-[18px] font-bold tracking-[-0.02em] text-slate-950">端末登録時の説明例</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  これから使う ID は、システム内部では username と呼びますが、使う文字列は同じです。最初のログイン後に端末登録画面が出たら、
                  ADMIN から伝えた登録コードを入れてください。登録が終わるといったんログイン画面へ戻るので、もう一度ログインして 6 桁 PIN を設定してください。
                  最後に 設定 &gt; 端末情報 で、登録済み端末 と PIN: 設定済み が出れば運用開始です。
                </p>
              </div>
            </div>
          </article>
          <article className="rounded-[24px] border border-slate-200/90 bg-slate-50/70 px-5 py-5">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-orange-100 p-3 text-orange-700">
                <ComputerDesktopIcon className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <h3 className="text-[18px] font-bold tracking-[-0.02em] text-slate-950">紛失時の説明例</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  端末をなくした場合は、まず ADMIN に連絡してください。先にアカウントを停止して使えない状態にします。そのあと新しい端末か予備端末を決めて、
                  新しい登録コードを発行します。新端末でログイン、登録コード入力、再ログイン、6 桁 PIN 設定まで終わったら、最後に ADMIN が再開します。
                </p>
              </div>
            </div>
          </article>
        </div>
        <div className="mt-5 rounded-[24px] border border-slate-200/90 bg-white px-5 py-5">
          <p className="text-sm font-semibold text-slate-900">詳細文書の保存先</p>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
            <li>`docs/operations/auth-device-operations-guide.md`</li>
            <li>`docs/operations/device-registration-guide.md`</li>
            <li>`docs/operations/lost-device-runbook.md`</li>
          </ul>
        </div>
      </AdminWorkbenchSection>
    </AdminWorkbenchPage>
  );
}
