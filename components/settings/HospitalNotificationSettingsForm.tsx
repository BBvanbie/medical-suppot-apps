"use client";

import { useState, useTransition } from "react";

import { SettingSaveStatus } from "@/components/settings/SettingSaveStatus";
import type { HospitalNotificationSettings } from "@/lib/hospitalSettingsValidation";

type HospitalNotificationSettingsFormProps = {
  initialValues: HospitalNotificationSettings;
};

export function HospitalNotificationSettingsForm({ initialValues }: HospitalNotificationSettingsFormProps) {
  const [values, setValues] = useState(initialValues);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  const save = (nextValues: HospitalNotificationSettings) => {
    setValues(nextValues);
    setStatus("saving");
    setMessage(undefined);

    startTransition(async () => {
      try {
        const res = await fetch("/api/settings/hospital/notifications", {
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

        const data = (await res.json()) as HospitalNotificationSettings;
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
    { key: "notifyNewRequest", label: "新規要請通知" },
    { key: "notifyReplyArrival", label: "返信到着通知" },
    { key: "notifyTransportDecided", label: "搬送決定通知" },
    { key: "notifyTransportDeclined", label: "辞退通知" },
    { key: "notifyRepeat", label: "再通知" },
    { key: "notifyReplyDelay", label: "返信遅延通知" },
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
              className="h-5 w-5 accent-emerald-600"
            />
          </label>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">返信遅延しきい値</span>
          <select
            value={values.replyDelayMinutes}
            disabled={isPending}
            onChange={(event) => save({ ...values, replyDelayMinutes: Number(event.target.value) as 10 | 15 | 20 })}
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
          >
            <option value={10}>10分</option>
            <option value={15}>15分</option>
            <option value={20}>20分</option>
          </select>
        </label>
      </div>
    </div>
  );
}
