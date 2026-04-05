"use client";

import { useState, useTransition } from "react";

import { useOfflineState } from "@/components/offline/useOfflineState";
import { SettingSaveStatus } from "@/components/settings/SettingSaveStatus";
import type { EmsInputSettings } from "@/lib/emsSettingsValidation";
import { saveOfflineEmsSetting } from "@/lib/offline/offlineEmsSettings";

type EmsInputSettingsFormProps = {
  initialValues: EmsInputSettings;
};

export function EmsInputSettingsForm({ initialValues }: EmsInputSettingsFormProps) {
  const [values, setValues] = useState(initialValues);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const { isOffline } = useOfflineState();
  const isOfflineRestricted = isOffline;

  const save = (nextValues: EmsInputSettings) => {
    setValues(nextValues);
    setStatus("saving");
    setMessage(undefined);

    startTransition(async () => {
      try {
        if (isOfflineRestricted) {
          await saveOfflineEmsSetting("input", nextValues);
          setStatus("saved");
          setMessage("オフラインのため端末に保存しました。オンライン復帰後に同期します。");
          return;
        }

        const res = await fetch("/api/settings/ambulance/input", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nextValues),
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { message?: string };
          setStatus("error");
          setMessage(data.message ?? "設定の保存に失敗しました。");
          return;
        }

        const data = (await res.json()) as EmsInputSettings;
        setValues(data);
        setStatus("saved");
        setMessage("設定を保存しました。");
      } catch {
        setStatus("error");
        setMessage("通信に失敗しました。");
      }
    });
  };

  const items = [
    { key: "autoTenkey", label: "テンキー自動表示" },
    { key: "autoFocus", label: "入力後の自動フォーカス移動" },
    { key: "vitalsNext", label: "バイタル入力時の次項目移動" },
    { key: "requiredAlert", label: "必須入力の強調" },
  ] as const;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <SettingSaveStatus status={status} message={message} />
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <label key={item.key} className="ds-panel-surface flex items-center justify-between px-4 py-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">{item.label}</p>
              <p className="mt-1 text-sm text-slate-500">変更するとすぐに反映されます。</p>
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
