"use client";

import { useMemo, useState, useTransition } from "react";

import { emitEmsDisplaySettingsChange } from "@/components/ems/emsDisplayProfileEvents";
import { useOfflineState } from "@/components/offline/useOfflineState";
import { SettingSaveStatus } from "@/components/settings/SettingSaveStatus";
import type { EmsDisplaySettings } from "@/lib/emsSettingsValidation";
import { saveOfflineEmsSetting } from "@/lib/offline/offlineEmsSettings";

type EmsDisplaySettingsFormProps = {
  initialValues: EmsDisplaySettings;
};

type DisplayOption<T extends string> = {
  value: T;
  label: string;
  description: string;
};

const textSizeOptions: DisplayOption<EmsDisplaySettings["textSize"]>[] = [
  { value: "standard", label: "標準", description: "現在の標準サイズで表示します" },
  { value: "large", label: "大きめ", description: "文字を一段階大きく表示します" },
  { value: "xlarge", label: "最大", description: "遠目でも見やすいサイズにします" },
];

const densityOptions: DisplayOption<EmsDisplaySettings["density"]>[] = [
  { value: "comfortable", label: "広め", description: "余白を広めに取り、1件ずつ見やすく表示します" },
  { value: "standard", label: "標準", description: "現在の標準的な表示密度です" },
  { value: "compact", label: "コンパクト", description: "余白を詰めて一覧に表示できる件数を優先します" },
];

function SliderField<T extends string>({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: T;
  options: DisplayOption<T>[];
  disabled: boolean;
  onChange: (value: T) => void;
}) {
  const currentIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const current = options[currentIndex] ?? options[0];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.18)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-700">{label}</p>
          <p className="mt-1 text-xs text-slate-500">{current.description}</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[var(--accent-blue)]">{current.label}</span>
      </div>
      <div className="mt-5 px-1">
        <input
          type="range"
          min={0}
          max={options.length - 1}
          step={1}
          value={currentIndex}
          disabled={disabled}
          onChange={(event) => onChange(options[Number(event.target.value)]?.value ?? options[0].value)}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-[var(--accent-blue)] disabled:cursor-not-allowed disabled:opacity-60"
        />
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] font-medium text-slate-500">
          {options.map((option) => (
            <span key={option.value}>{option.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function EmsDisplaySettingsForm({ initialValues }: EmsDisplaySettingsFormProps) {
  const [savedValues, setSavedValues] = useState(initialValues);
  const [draftValues, setDraftValues] = useState(initialValues);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const { isOffline } = useOfflineState();
  const isOfflineRestricted = isOffline;

  const isDirty = useMemo(
    () => draftValues.textSize !== savedValues.textSize || draftValues.density !== savedValues.density,
    [draftValues, savedValues],
  );

  const save = () => {
    if (!isDirty || isPending) return;
    setStatus("saving");
    setMessage(undefined);

    startTransition(async () => {
      try {
        if (isOfflineRestricted) {
          await saveOfflineEmsSetting("display", draftValues);
          setSavedValues(draftValues);
          setStatus("saved");
          setMessage("オフラインのため端末に保存しました。オンライン復帰後に同期します。");
          return;
        }

        const res = await fetch("/api/settings/ambulance/display", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draftValues),
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { message?: string };
          setStatus("error");
          setMessage(data.message ?? "表示設定の保存に失敗しました。");
          return;
        }

        const data = (await res.json()) as EmsDisplaySettings;
        setSavedValues(data);
        setDraftValues(data);
        emitEmsDisplaySettingsChange(data);
        setStatus("saved");
        setMessage("表示設定を保存しました。");
      } catch {
        setStatus("error");
        setMessage("通信に失敗しました。");
      }
    });
  };

  const onChange = (nextValues: EmsDisplaySettings) => {
    setDraftValues(nextValues);
    emitEmsDisplaySettingsChange(nextValues);
    setStatus("idle");
    setMessage("調整内容を画面へ反映中です。保存すると次回以降も保持されます。");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end">
        <SettingSaveStatus
          status={status === "saved" && isDirty ? "idle" : status}
          message={isDirty && status !== "saving" ? "未保存: 変更内容は画面に反映中です" : message}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SliderField
          label="文字サイズ"
          value={draftValues.textSize}
          options={textSizeOptions}
          disabled={isPending}
          onChange={(textSize) => onChange({ ...draftValues, textSize })}
        />
        <SliderField
          label="一覧表示密度"
          value={draftValues.density}
          options={densityOptions}
          disabled={isPending}
          onChange={(density) => onChange({ ...draftValues, density })}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={!isDirty || isPending}
          className="inline-flex h-11 items-center rounded-xl bg-[var(--accent-blue)] px-5 text-sm font-semibold text-white transition hover:bg-[color-mix(in_srgb,var(--accent-blue),#000_10%)] disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isPending ? "保存中..." : "保存"}
        </button>
      </div>
    </div>
  );
}
