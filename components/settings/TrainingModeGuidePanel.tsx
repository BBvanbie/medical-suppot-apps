"use client";

import Link from "next/link";
import { ArrowRightIcon, ExclamationTriangleIcon, InformationCircleIcon, PlayCircleIcon, QuestionMarkCircleIcon } from "@heroicons/react/24/solid";

type TrainingModeGuidePanelProps = {
  role: "EMS" | "HOSPITAL" | "ADMIN" | "DISPATCH";
  tone?: "ems" | "hospital" | "admin" | "dispatch";
};

type RoleContent = {
  title: string;
  description: string;
  firstAction: string;
  steps: string[];
  cautions: string[];
  faqs: Array<{ question: string; answer: string }>;
  actionHref?: string;
  actionLabel?: string;
};

const toneClassMap = {
  ems: {
    accent: "text-blue-700",
    panel: "border-blue-100/80 bg-transparent",
    soft: "border-blue-100/80 bg-blue-50/20",
    chip: "border-blue-200 bg-blue-50 text-blue-700",
    icon: "bg-blue-100 text-blue-700",
    link: "text-blue-700 hover:text-blue-800",
  },
  hospital: {
    accent: "text-emerald-700",
    panel: "border-emerald-100/80 bg-transparent",
    soft: "border-emerald-100/80 bg-emerald-50/20",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: "bg-emerald-100 text-emerald-700",
    link: "text-emerald-700 hover:text-emerald-800",
  },
  admin: {
    accent: "text-orange-700",
    panel: "border-orange-100/80 bg-transparent",
    soft: "border-orange-100/80 bg-orange-50/20",
    chip: "border-orange-200 bg-orange-50 text-orange-700",
    icon: "bg-orange-100 text-orange-700",
    link: "text-orange-700 hover:text-orange-800",
  },
  dispatch: {
    accent: "text-amber-700",
    panel: "border-amber-100/80 bg-transparent",
    soft: "border-amber-100/80 bg-amber-50/20",
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    icon: "bg-amber-100 text-amber-700",
    link: "text-amber-700 hover:text-amber-800",
  },
} as const;

const contentMap: Record<TrainingModeGuidePanelProps["role"], RoleContent> = {
  EMS: {
    title: "救急隊向けの使い方",
    description: "訓練中は TRAINING 事案だけを表示し、作成、病院検索、送信、搬送判断までを本番と混ぜずに確認します。",
    firstAction: "開始前に TRAINING バナーが出ているか確認し、事案作成へ進みます。",
    steps: [
      "設定で TRAINING を保存する",
      "TRAINING バナーと mode badge を確認する",
      "事案作成、病院検索、送信履歴を訓練データだけで進める",
      "終了後は LIVE に戻し、バナーが消えたことを確認する",
    ],
    cautions: [
      "TRAINING のまま本番運用へ戻らない",
      "統計画面は訓練中は空表示になる",
      "訓練中に作った事案は本番一覧に混ざらない",
    ],
    faqs: [
      {
        question: "訓練中に本番の事案は見えますか",
        answer: "見えません。TRAINING では訓練データだけを表示します。本番確認が必要な場合は LIVE に戻してください。",
      },
      {
        question: "訓練で作った事案は本番統計に入りますか",
        answer: "入りません。TRAINING データは本番の一覧、通知、統計から除外されます。",
      },
    ],
    actionHref: "/cases/new",
    actionLabel: "事案作成へ進む",
  },
  HOSPITAL: {
    title: "病院向けの使い方",
    description: "訓練中は TRAINING の受入要請、相談、患者だけを扱います。本番の通知や一覧とは混ざりません。",
    firstAction: "保存後に TRAINING バナーが出ているか確認し、受入要請一覧へ進みます。",
    steps: [
      "設定で TRAINING を保存する",
      "受入要請一覧、相談一覧、患者一覧が訓練案件だけに切り替わることを確認する",
      "要相談、受入可能、搬送患者の導線を訓練データで確認する",
      "終了後は LIVE に戻し、通常一覧へ戻ったことを確認する",
    ],
    cautions: [
      "訓練中は本番通知を確認できない",
      "病院統計は訓練中は空表示になる",
      "TRAINING と LIVE を同時に並べて確認しない",
    ],
    faqs: [
      {
        question: "訓練中に本番要請へ応答できますか",
        answer: "できません。TRAINING 表示では訓練要請だけが見えます。本番対応が必要なら LIVE に戻してください。",
      },
      {
        question: "MFA は訓練でも必要ですか",
        answer: "はい。HOSPITAL は訓練か本番かに関係なく、現行方針では WebAuthn MFA が必要です。",
      },
    ],
    actionHref: "/hospitals/requests",
    actionLabel: "受入要請一覧へ進む",
  },
  ADMIN: {
    title: "管理者向けの使い方",
    description: "管理者も同時表示ではなく mode 切替で監視します。訓練中は TRAINING 一覧だけを確認し、必要なら終了後に一括リセットします。",
    firstAction: "対象が TRAINING であることを確認し、監視、一覧、reset の順で扱います。",
    steps: [
      "設定で TRAINING を保存する",
      "監視や一覧を訓練データだけで確認する",
      "説明会や訓練の終了後に training reset 件数を確認する",
      "必要なら一括リセットし、最後に LIVE へ戻す",
    ],
    cautions: [
      "TRAINING reset は LIVE データを消さないが、訓練データは戻せない",
      "訓練中の統計は本番 KPI として表示しない",
      "参加者が TRAINING のまま残っていないか終了後に確認する",
    ],
    faqs: [
      {
        question: "TRAINING 中でも全体監視は見られますか",
        answer: "見られます。ただし一覧や統計は現在モードだけを対象にし、本番と訓練を同時表示しません。",
      },
      {
        question: "一括リセットで何が消えますか",
        answer: "TRAINING の事案、送信履歴、相談イベント、患者、通知が削除対象です。LIVE データ、組織、ユーザー、監査ログは残ります。",
      },
    ],
    actionHref: "/admin/monitoring",
    actionLabel: "監視画面へ進む",
  },
  DISPATCH: {
    title: "指令向けの使い方",
    description: "指令では TRAINING に切り替えると、起票した案件も一覧も訓練データだけを扱います。EMS 側への起票確認を本番と分離して行えます。",
    firstAction: "開始前に mode を TRAINING に保存し、起票画面の保存先説明が訓練向けに変わることを確認します。",
    steps: [
      "設定で TRAINING を保存する",
      "新規起票画面で TRAINING badge と保存先説明を確認する",
      "訓練案件を起票し、指令一覧で TRAINING 案件だけが見えることを確認する",
      "終了後は LIVE に戻し、通常一覧へ戻ったことを確認する",
    ],
    cautions: [
      "TRAINING のまま通常起票を始めない",
      "指令一覧は現在モードの案件だけを表示する",
      "TRAINING の指令案件は ADMIN の reset 対象になる",
    ],
    faqs: [
      {
        question: "指令側でも訓練案件を作れますか",
        answer: "作れます。DISPATCH は TRAINING 中に起票した案件を TRAINING データとして保存します。",
      },
      {
        question: "終了後の片付けはどうしますか",
        answer: "自身は LIVE へ戻し、必要に応じて ADMIN が TRAINING データを一括リセットします。",
      },
    ],
    actionHref: "/dispatch/new",
    actionLabel: "新規起票へ進む",
  },
};

export function TrainingModeGuidePanel({ role, tone = "admin" }: TrainingModeGuidePanelProps) {
  const content = contentMap[role];
  const toneClasses = toneClassMap[tone];

  return (
    <div className={`space-y-4 ${toneClasses.panel}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`ds-text-xs-compact font-semibold ds-track-eyebrow-wide ${toneClasses.accent}`}>TRAINING GUIDE</p>
          <h3 className="mt-2 ds-text-xl-compact font-bold ds-track-title text-slate-950">{content.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{content.description}</p>
        </div>
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses.chip}`}>{role}</span>
      </div>

      <div className={`ds-radius-section border px-4 py-4 ${toneClasses.soft}`}>
        <div className="flex items-start gap-3">
          <div className={`rounded-2xl p-2 ${toneClasses.icon}`}>
            <InformationCircleIcon className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">最初に確認すること</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{content.firstAction}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:ds-grid-balance-reverse">
        <article className={`ds-radius-section border px-4 py-4 ${toneClasses.soft}`}>
          <div className="flex items-center gap-2">
            <PlayCircleIcon className={`h-5 w-5 ${toneClasses.accent}`} aria-hidden />
            <h4 className="text-sm font-bold text-slate-900">簡易フロー</h4>
          </div>
          <ol className="mt-3 space-y-3">
            {content.steps.map((step, index) => (
              <li key={step} className="grid ds-grid-mini-icon-main gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">{index + 1}</span>
                <p className="text-sm leading-6 text-slate-600">{step}</p>
              </li>
            ))}
          </ol>
        </article>

        <article className={`ds-radius-section border px-4 py-4 ${toneClasses.soft}`}>
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className={`h-5 w-5 ${toneClasses.accent}`} aria-hidden />
            <h4 className="text-sm font-bold text-slate-900">注意点</h4>
          </div>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
            {content.cautions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>

      <article className={`ds-radius-section border px-4 py-4 ${toneClasses.soft}`}>
        <div className="flex items-center gap-2">
          <QuestionMarkCircleIcon className={`h-5 w-5 ${toneClasses.accent}`} aria-hidden />
          <h4 className="text-sm font-bold text-slate-900">FAQ</h4>
        </div>
        <div className="mt-3 space-y-3">
          {content.faqs.map((item) => (
            <details key={item.question} className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">{item.question}</summary>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.answer}</p>
            </details>
          ))}
        </div>
      </article>

      {content.actionHref && content.actionLabel ? (
        <div className="flex justify-end">
          <Link href={content.actionHref} className={`inline-flex items-center gap-2 text-sm font-semibold transition ${toneClasses.link}`}>
            {content.actionLabel}
            <ArrowRightIcon className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
