"use client";

import { useMemo, useState, useTransition } from "react";

import { SettingSaveStatus } from "@/components/settings/SettingSaveStatus";
import { UserModeBadge } from "@/components/shared/UserModeBadge";
import type { AppMode } from "@/lib/appMode";

type UserModeSettingsFormProps = {
  initialMode: AppMode;
  tone?: "ems" | "hospital" | "admin" | "dispatch";
};

const toneClassMap = {
  ems: {
    selected: "border-blue-300 bg-blue-50 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.14)]",
    accent: "text-blue-600",
    selectedBadge: "bg-blue-600 text-white",
  },
  hospital: {
    selected: "border-emerald-300 bg-emerald-50 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.14)]",
    accent: "text-emerald-600",
    selectedBadge: "bg-emerald-600 text-white",
  },
  admin: {
    selected: "border-orange-300 bg-orange-50 shadow-[inset_0_0_0_1px_rgba(249,115,22,0.14)]",
    accent: "text-orange-600",
    selectedBadge: "bg-orange-600 text-white",
  },
  dispatch: {
    selected: "border-amber-300 bg-amber-50 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.18)]",
    accent: "text-amber-600",
    selectedBadge: "bg-amber-600 text-white",
  },
} as const;

const modeOptions: Array<{ mode: AppMode; title: string; description: string }> = [
  {
    mode: "LIVE",
    title: "LIVE を表示",
    description: "本番データのみを表示します。通常運用はこちらを使います。",
  },
  {
    mode: "TRAINING",
    title: "TRAINING を表示",
    description: "訓練データのみを表示します。訓練モード中のみ training 事案を作成できます。",
  },
];

export function UserModeSettingsForm({ initialMode, tone = "admin" }: UserModeSettingsFormProps) {
  const [savedMode, setSavedMode] = useState<AppMode>(initialMode);
  const [draftMode, setDraftMode] = useState<AppMode>(initialMode);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  const isDirty = useMemo(() => draftMode !== savedMode, [draftMode, savedMode]);
  const toneClasses = toneClassMap[tone];

  const save = () => {
    if (!isDirty || isPending) return;
    setStatus("saving");
    setMessage(undefined);

    startTransition(async () => {
      try {
        const res = await fetch("/api/settings/user-mode", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: draftMode }),
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { message?: string };
          setStatus("error");
          setMessage(data.message ?? "モード設定の保存に失敗しました。");
          return;
        }

        const data = (await res.json()) as { mode: AppMode };
        setSavedMode(data.mode);
        setDraftMode(data.mode);
        setStatus("saved");
        setMessage(data.mode === "TRAINING" ? "TRAINING 表示に切り替えました。" : "LIVE 表示に切り替えました。");
      } catch {
        setStatus("error");
        setMessage("通信に失敗しました。");
      }
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-700">現在の表示モード</p>
          <p className="mt-1 text-xs leading-6 text-slate-500">LIVE と TRAINING は同じ DB 内に共存しますが、画面では選択したモードだけを表示します。</p>
        </div>
        <UserModeBadge mode={draftMode} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {modeOptions.map((option) => {
          const selected = option.mode === draftMode;
          return (
            <button
              key={option.mode}
              type="button"
              onClick={() => {
                setDraftMode(option.mode);
                setStatus("idle");
                setMessage(option.mode === "TRAINING" ? "保存すると training 一覧と training 作成導線だけを扱います。" : "保存すると live 一覧と live 作成導線だけを扱います。");
              }}
              disabled={isPending}
              aria-pressed={selected}
              className={[
                "ds-panel-surface min-h-[168px] px-5 py-4 text-left transition",
                selected ? toneClasses.selected : "hover:border-slate-300 hover:bg-slate-50/80",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`text-xs font-semibold tracking-[0.16em] ${toneClasses.accent}`}>{option.mode}</p>
                    {selected ? (
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] ${toneClasses.selectedBadge}`}>運用中</span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-base font-bold text-slate-900">{option.title}</p>
                </div>
                <div className="shrink-0">
                  <UserModeBadge mode={option.mode} compact />
                </div>
              </div>
              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="text-sm leading-7 text-slate-600">{option.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <SettingSaveStatus
          status={status === "saved" && isDirty ? "idle" : status}
          message={isDirty && status !== "saving" ? "未保存: 保存すると表示対象と作成対象が切り替わります。" : message}
        />
        <button type="button" onClick={save} disabled={!isDirty || isPending} className="ds-button ds-button--primary px-5">
          {isPending ? "保存中..." : "保存"}
        </button>
      </div>
    </div>
  );
}
