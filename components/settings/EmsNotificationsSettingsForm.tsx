"use client";

import { useState, useTransition } from "react";

import { SettingSaveStatus } from "@/components/settings/SettingSaveStatus";
import type { EmsNotificationSettings } from "@/lib/emsSettingsValidation";

type EmsNotificationsSettingsFormProps = {
  initialValues: EmsNotificationSettings;
};

export function EmsNotificationsSettingsForm({ initialValues }: EmsNotificationsSettingsFormProps) {
  const [values, setValues] = useState(initialValues);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  const save = (nextValues: EmsNotificationSettings) => {
    setValues(nextValues);
    setStatus("saving");
    setMessage(undefined);

    startTransition(async () => {
      try {
        const res = await fetch("/api/settings/ambulance/notifications", {
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

        const data = (await res.json()) as EmsNotificationSettings;
        setValues(data);
        setStatus("saved");
        setMessage("保存しました。");
      } catch {
        setStatus("error");
        setMessage("通信に失敗しました。");
      }
    });
  };

  const items = [
    { key: "notifyNewResponse", label: "新着回答通知" },
    { key: "notifyConsult", label: "要相談通知" },
    { key: "notifyAccepted", label: "受入可能通知" },
    { key: "notifyDeclined", label: "受入不可通知" },
    { key: "notifyRepeat", label: "再通知" },
  ] as const;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <SettingSaveStatus status={status} message={message} />
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <label key={item.key} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">{item.label}</p>
              <p className="mt-1 text-sm text-slate-500">変更すると即時保存されます。</p>
            </div>
            <input
              type="checkbox"
              checked={values[item.key]}
              disabled={isPending}
              onChange={(event) => save({ ...values, [item.key]: event.target.checked })}
              className="h-5 w-5 accent-blue-600"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
