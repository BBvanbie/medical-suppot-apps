"use client";

import { LoadingLabel } from "@/components/shared/loading/LoadingLabel";

type PendingOverlayProps = {
  open: boolean;
  label?: string;
  className?: string;
};

export function PendingOverlay({ open, label = "処理中...", className = "" }: PendingOverlayProps) {
  if (!open) return null;

  return (
    <div
      className={`absolute inset-0 z-10 flex items-center justify-center ds-radius-inherit ds-bg-surface-overlay ds-backdrop-blur-subtle ${className}`.trim()}
    >
      <div className="ds-loading-surface px-4 py-3 text-sm font-semibold text-slate-700">
        <LoadingLabel label={label} />
      </div>
    </div>
  );
}
