"use client";

import { useEffect, useState, useTransition } from "react";

import { SettingActionButton } from "@/components/settings/SettingActionButton";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

type TrainingDataSummary = {
  cases: number;
  hospitalRequests: number;
  hospitalRequestTargets: number;
  hospitalRequestEvents: number;
  hospitalPatients: number;
  notifications: number;
};

type AdminTrainingResetFormProps = {
  initialSummary: TrainingDataSummary;
};

const summaryItems: Array<{ key: keyof TrainingDataSummary; label: string }> = [
  { key: "cases", label: "訓練事案" },
  { key: "hospitalRequests", label: "送信履歴" },
  { key: "hospitalRequestTargets", label: "送信先 target" },
  { key: "hospitalRequestEvents", label: "相談 / 状態イベント" },
  { key: "hospitalPatients", label: "搬送患者" },
  { key: "notifications", label: "訓練通知" },
];

export function AdminTrainingResetForm({ initialSummary }: AdminTrainingResetFormProps) {
  const [summary, setSummary] = useState<TrainingDataSummary>(initialSummary);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSummary(initialSummary);
  }, [initialSummary]);

  const refreshSummary = async () => {
    const res = await fetch("/api/admin/training/reset", { cache: "no-store" });
    if (!res.ok) {
      throw new Error("failed");
    }
    const data = (await res.json()) as { summary: TrainingDataSummary };
    setSummary(data.summary);
  };

  const runReset = () => {
    if (isPending) return;
    setError(undefined);
    setMessage(undefined);

    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/training/reset", { method: "DELETE" });
        const data = (await res.json().catch(() => ({}))) as { before?: TrainingDataSummary; after?: TrainingDataSummary; message?: string };
        if (!res.ok) {
          setError(data.message ?? "訓練データの一括リセットに失敗しました。");
          return;
        }
        setSummary(data.after ?? initialSummary);
        setMessage(`訓練データを一括リセットしました。削除前 ${data.before?.cases ?? 0} 件 -> 削除後 ${data.after?.cases ?? 0} 件`);
        setConfirmOpen(false);
      } catch {
        setError("訓練データの一括リセットに失敗しました。");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3" data-testid="training-reset-summary">
        {summaryItems.map((item) => (
          <div key={item.key} className="ds-muted-panel rounded-2xl px-4 py-4">
            <p className="ds-text-xs-compact font-semibold ds-track-section text-slate-500">{item.label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950" data-testid={`training-reset-${item.key}`}>
              {summary[item.key]}
            </p>
          </div>
        ))}
      </div>

      <div className="ds-muted-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">訓練データ一括リセット</p>
          <p className="mt-1 text-xs leading-6 text-slate-500">TRAINING の事案、送信履歴、相談イベント、患者、通知だけを削除します。LIVE データ、組織、ユーザー、監査ログは削除しません。</p>
          {message ? <p className="mt-2 text-sm font-semibold text-emerald-700">{message}</p> : null}
          {error ? <p className="mt-2 text-sm font-semibold text-rose-700">{error}</p> : null}
        </div>
        <div className="flex gap-2">
          <SettingActionButton tone="secondary" onClick={() => void refreshSummary()} disabled={isPending}>
            再読込
          </SettingActionButton>
          <SettingActionButton
            tone="danger"
            onClick={() => setConfirmOpen(true)}
            disabled={isPending}
            data-testid="training-reset-open-confirm"
          >
            訓練データを一括リセット
          </SettingActionButton>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="訓練データを一括リセットしますか"
        description="TRAINING の事案、送信履歴、相談イベント、搬送患者、通知を削除します。LIVE データは削除しません。"
        confirmLabel="一括リセットする"
        busy={isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void runReset()}
      />
    </div>
  );
}
