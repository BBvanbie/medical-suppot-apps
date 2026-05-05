"use client";

import { LoadingLabel } from "@/components/shared/loading/LoadingLabel";

type PageLoadingOverlayProps = {
  open: boolean;
  label?: string;
};

export function PageLoadingOverlay({ open, label = "読み込み中..." }: PageLoadingOverlayProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 ds-z-loading flex items-center justify-center ds-bg-surface-overlay ds-backdrop-blur-overlay">
      <div className="ds-loading-surface px-5 py-4 text-sm font-semibold text-slate-700">
        <LoadingLabel label={label} />
      </div>
    </div>
  );
}
