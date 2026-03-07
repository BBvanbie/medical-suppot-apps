"use client";

import { useState, useTransition } from "react";

import { SettingSaveStatus } from "@/components/settings/SettingSaveStatus";
import type { EmsDisplaySettings } from "@/lib/emsSettingsValidation";

type EmsDisplaySettingsFormProps = {
  initialValues: EmsDisplaySettings;
};

export function EmsDisplaySettingsForm({ initialValues }: EmsDisplaySettingsFormProps) {
  const [values, setValues] = useState(initialValues);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  const save = (nextValues: EmsDisplaySettings) => {
    setValues(nextValues);
    setStatus("saving");
    setMessage(undefined);

    startTransition(async () => {
      try {
        const res = await fetch("/api/settings/ambulance/display", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nextValues),
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { message?: string };
          setStatus("error");
          setMessage(data.message ?? "保存に失敗しました。");
          return;
        }

        const data = (await res.json()) as EmsDisplaySettings;
        setValues(data);
        setStatus("saved");
        setMessage("保存しました。");
      } catch {
        setStatus("error");
        setMessage("通信に失敗しました。");
      }
    });
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <SettingSaveStatus status={status} message={message} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">文字サイズ</span>
          <select
            value={values.textSize}
            disabled={isPending}
            onChange={(event) => save({ ...values, textSize: event.target.value as EmsDisplaySettings["textSize"] })}
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
          >
            <option value="standard">標準</option>
            <option value="large">大きめ</option>
            <option value="xlarge">最大</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">一覧表示密度</span>
          <select
            value={values.density}
            disabled={isPending}
            onChange={(event) => save({ ...values, density: event.target.value as EmsDisplaySettings["density"] })}
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
          >
            <option value="standard">標準</option>
            <option value="comfortable">広め</option>
            <option value="compact">コンパクト</option>
          </select>
        </label>
      </div>
    </div>
  );
}
