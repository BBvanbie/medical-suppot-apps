"use client";

import { LoadingLabel } from "@/components/shared/loading/LoadingLabel";

type PageLoadingOverlayProps = {
  open: boolean;
  label?: string;
};

export function PageLoadingOverlay({ open, label = "読み込み中..." }: PageLoadingOverlayProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[var(--ds-surface-overlay)] backdrop-blur-[2px]">
      <div className="ds-loading-surface px-5 py-4 text-sm font-semibold text-slate-700">
        <LoadingLabel label={label} />
      </div>
    </div>
  );
}
