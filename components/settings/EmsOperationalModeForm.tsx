"use client";

import { useMemo, useState, useTransition } from "react";

import { useOfflineState } from "@/components/offline/useOfflineState";
import { SettingSaveStatus } from "@/components/settings/SettingSaveStatus";
import { BUTTON_BASE_CLASS, BUTTON_VARIANT_CLASS } from "@/components/shared/buttonStyles";
import { getEmsOperationalModeDescription, getEmsOperationalModeLabel, getEmsOperationalModeShortLabel } from "@/lib/emsOperationalMode";
import { saveOfflineEmsSetting } from "@/lib/offline/offlineEmsSettings";
import type { EmsOperationalMode } from "@/lib/emsSettingsValidation";

type EmsOperationalModeFormProps = {
  initialValue: EmsOperationalMode;
};

const options: EmsOperationalMode[] = ["STANDARD", "TRIAGE"];

export function EmsOperationalModeForm({ initialValue }: EmsOperationalModeFormProps) {
  const [savedValue, setSavedValue] = useState(initialValue);
  const [draftValue, setDraftValue] = useState(initialValue);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const { isOffline } = useOfflineState();

  const isDirty = useMemo(() => draftValue !== savedValue, [draftValue, savedValue]);

  const save = () => {
    if (!isDirty || isPending) return;
    setStatus("saving");
    setMessage(undefined);

    startTransition(async () => {
      try {
        if (isOffline) {
          await saveOfflineEmsSetting("operationalMode", { operationalMode: draftValue });
          setSavedValue(draftValue);
          setStatus("saved");
          setMessage("オフラインのため端末に保存しました。オンライン復帰後に同期します。");
          return;
        }

        const res = await fetch("/api/settings/ambulance/operational-mode", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operationalMode: draftValue }),
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { message?: string };
          setStatus("error");
          setMessage(data.message ?? "運用モードの保存に失敗しました。");
          return;
        }

        const data = (await res.json()) as { operationalMode: EmsOperationalMode };
        setSavedValue(data.operationalMode);
        setDraftValue(data.operationalMode);
        setStatus("saved");
        setMessage(data.operationalMode === "TRIAGE" ? "トリアージモードへ切り替えました。" : "通常運用へ切り替えました。");
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
          <p className="text-sm font-semibold text-slate-700">現在の業務表示</p>
          <p className="mt-1 text-xs leading-6 text-slate-500">LIVE / TRAINING の表示対象とは別に、EMS 画面の優先導線だけを切り替えます。</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{getEmsOperationalModeLabel(draftValue)}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {options.map((option) => {
          const selected = draftValue === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => {
                setDraftValue(option);
                setStatus("idle");
                setMessage(option === "TRIAGE" ? "保存すると EMS ホームと一覧の優先導線をトリアージ向けに切り替えます。" : "保存すると通常の導線と統計表示へ戻します。");
              }}
              disabled={isPending}
              aria-pressed={selected}
              className={[
                "ds-panel-surface ds-min-h-mode-card px-5 py-4 text-left transition",
                selected ? "border-blue-300 bg-blue-50 ds-shadow-inset-blue" : "hover:border-slate-300 hover:bg-slate-50/80",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold ds-track-eyebrow text-blue-600">{getEmsOperationalModeShortLabel(option)}</p>
                    {selected ? (
                      <span className="inline-flex rounded-full bg-blue-600 px-2.5 py-1 ds-text-2xs font-semibold ds-track-label text-white">運用中</span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-base font-bold text-slate-900">{getEmsOperationalModeLabel(option)}</p>
                </div>
              </div>
              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="text-sm leading-7 text-slate-600">{getEmsOperationalModeDescription(option)}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <SettingSaveStatus
          status={status === "saved" && isDirty ? "idle" : status}
          message={isDirty && status !== "saving" ? "未保存: 保存すると EMS の導線とバナー表示が切り替わります。" : message}
        />
        <button type="button" onClick={save} disabled={!isDirty || isPending} className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.primary} px-5`}>
          {isPending ? "保存中..." : "保存"}
        </button>
      </div>
    </div>
  );
}
