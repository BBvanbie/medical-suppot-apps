"use client";

import { useState, useTransition } from "react";

import { SettingActionButton } from "@/components/settings/SettingActionButton";
import { SettingSaveStatus } from "@/components/settings/SettingSaveStatus";
import type { EmsSyncState } from "@/lib/emsSyncRepository";

type EmsSyncSettingsFormProps = {
  initialState: EmsSyncState;
};

export function EmsSyncSettingsForm({ initialState }: EmsSyncSettingsFormProps) {
  const [state, setState] = useState(initialState);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  const runAction = (endpoint: "/api/settings/ambulance/sync/run" | "/api/settings/ambulance/sync/retry", successMessage: string) => {
    setStatus("saving");
    setMessage(undefined);

    startTransition(async () => {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { message?: string };
          setStatus("error");
          setMessage(data.message ?? "同期処理に失敗しました。");
          return;
        }

        const data = (await res.json()) as EmsSyncState;
        setState(data);
        setStatus("saved");
        setMessage(successMessage);
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
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "通信状態", value: state.connectionStatus === "online" ? "オンライン" : "オフライン" },
          { label: "最終同期日時", value: state.lastSyncAt ?? "未実行" },
          { label: "未送信件数", value: `${state.pendingCount}件` },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
            <p className="mt-2 text-base font-semibold text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <p className="text-sm font-semibold text-slate-900">手動同期</p>
          <p className="mt-1 text-sm text-slate-500">最新データとの同期を実行します。</p>
          <p className="mt-3 text-xs text-slate-400">状態: {state.lastSyncStatus}</p>
          <div className="mt-4">
            <SettingActionButton disabled={isPending} onClick={() => runAction("/api/settings/ambulance/sync/run", "手動同期を実行しました。")}>
              手動同期
            </SettingActionButton>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <p className="text-sm font-semibold text-slate-900">未送信データ再送</p>
          <p className="mt-1 text-sm text-slate-500">未送信のまま残っているデータを再送します。</p>
          <p className="mt-3 text-xs text-slate-400">状態: {state.lastRetryStatus}</p>
          <div className="mt-4">
            <SettingActionButton
              tone="secondary"
              disabled={isPending}
              onClick={() => runAction("/api/settings/ambulance/sync/retry", "未送信データの再送を実行しました。")}
            >
              未送信データ再送
            </SettingActionButton>
          </div>
        </div>
      </div>
    </div>
  );
}
