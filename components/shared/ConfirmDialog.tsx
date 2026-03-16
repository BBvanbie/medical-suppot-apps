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
    <div className="modal-shell-pad fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40">
      <div className="content-card content-card--spacious w-full max-w-md">
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



