"use client";

import { useMemo, useState, useTransition } from "react";

import { SettingSaveStatus } from "@/components/settings/SettingSaveStatus";
import type { EmsDisplaySettings } from "@/lib/emsSettingsValidation";

type EmsDisplaySettingsFormProps = {
  initialValues: EmsDisplaySettings;
};

type DisplayOption<T extends string> = {
  value: T;
  label: string;
  description: string;
};

const textSizeOptions: DisplayOption<EmsDisplaySettings["textSize"]>[] = [
  { value: "standard", label: "\u6a19\u6e96", description: "\u73fe\u5728\u306e\u8a2d\u5b9a" },
  { value: "large", label: "\u5927\u304d\u3081", description: "\u6587\u5b57\u3092\u4e00\u6bb5\u968e\u5927\u304d\u304f\u8868\u793a" },
  { value: "xlarge", label: "\u6700\u5927", description: "\u9060\u76ee\u3067\u3082\u898b\u3084\u3059\u3044\u30b5\u30a4\u30ba" },
];

const densityOptions: DisplayOption<EmsDisplaySettings["density"]>[] = [
  { value: "comfortable", label: "\u5e83\u3081", description: "\u4e00\u4ef6\u305a\u3064\u3086\u3063\u305f\u308a\u8868\u793a" },
  { value: "standard", label: "\u6a19\u6e96", description: "\u73fe\u5728\u306e\u8868\u793a\u5bc6\u5ea6" },
  { value: "compact", label: "\u30b3\u30f3\u30d1\u30af\u30c8", description: "\u4e00\u89a7\u306b\u8868\u793a\u3059\u308b\u4ef6\u6570\u3092\u512a\u5148" },
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
        const res = await fetch("/api/settings/ambulance/display", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draftValues),
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { message?: string };
          setStatus("error");
          setMessage(data.message ?? "\u8868\u793a\u8a2d\u5b9a\u306e\u4fdd\u5b58\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002");
          return;
        }

        const data = (await res.json()) as EmsDisplaySettings;
        setSavedValues(data);
        setDraftValues(data);
        setStatus("saved");
        setMessage("\u8868\u793a\u8a2d\u5b9a\u3092\u4fdd\u5b58\u3057\u307e\u3057\u305f\u3002");
      } catch {
        setStatus("error");
        setMessage("\u901a\u4fe1\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002");
      }
    });
  };

  const onChange = (nextValues: EmsDisplaySettings) => {
    setDraftValues(nextValues);
    setStatus("idle");
    setMessage(undefined);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end">
        <SettingSaveStatus
          status={status === "saved" && isDirty ? "idle" : status}
          message={isDirty && status !== "saving" ? "\u672a\u4fdd\u5b58" : message}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SliderField
          label="\u6587\u5b57\u30b5\u30a4\u30ba"
          value={draftValues.textSize}
          options={textSizeOptions}
          disabled={isPending}
          onChange={(textSize) => onChange({ ...draftValues, textSize })}
        />
        <SliderField
          label="\u4e00\u89a7\u8868\u793a\u5bc6\u5ea6"
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
          {isPending ? "\u4fdd\u5b58\u4e2d..." : "\u4fdd\u5b58"}
        </button>
      </div>
    </div>
  );
}
