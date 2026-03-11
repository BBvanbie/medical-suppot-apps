"use client";

import { SettingActionButton } from "@/components/settings/SettingActionButton";
import { LoadingButton } from "@/components/shared/loading";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "確認する",
  cancelLabel = "キャンセル",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.45)]">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <SettingActionButton tone="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </SettingActionButton>
          <LoadingButton
            onClick={onConfirm}
            loading={busy}
            loadingLabel="保存中..."
            className="h-11 rounded-2xl border border-amber-600 bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {confirmLabel}
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}



