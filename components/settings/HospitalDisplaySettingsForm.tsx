"use client";

import { useState, useTransition } from "react";

import { SettingSaveStatus } from "@/components/settings/SettingSaveStatus";
import type { HospitalDisplaySettings } from "@/lib/hospitalSettingsValidation";

type HospitalDisplaySettingsFormProps = {
  initialValues: HospitalDisplaySettings;
};

export function HospitalDisplaySettingsForm({ initialValues }: HospitalDisplaySettingsFormProps) {
  const [values, setValues] = useState(initialValues);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  const save = (nextValues: HospitalDisplaySettings) => {
    setValues(nextValues);
    setStatus("saving");
    setMessage(undefined);

    startTransition(async () => {
      try {
        const res = await fetch("/api/settings/hospital/display", {
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

        const data = (await res.json()) as HospitalDisplaySettings;
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
          <span className="ds-field-label">一覧表示密度</span>
          <select
            value={values.displayDensity}
            disabled={isPending}
            onChange={(event) => save({ ...values, displayDensity: event.target.value as HospitalDisplaySettings["displayDensity"] })}
            className="ds-field"
          >
            <option value="standard">標準</option>
            <option value="comfortable">広め</option>
            <option value="compact">コンパクト</option>
          </select>
        </label>
        <label className="block">
          <span className="ds-field-label">初期ソート</span>
          <select
            value={values.defaultSort}
            disabled={isPending}
            onChange={(event) => save({ ...values, defaultSort: event.target.value as HospitalDisplaySettings["defaultSort"] })}
            className="ds-field"
          >
            <option value="updated">更新順</option>
            <option value="received">受信順</option>
            <option value="priority">重要度順</option>
          </select>
        </label>
      </div>
    </div>
  );
}
