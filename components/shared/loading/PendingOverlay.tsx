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
      className={`absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-white/75 backdrop-blur-[1px] ${className}`.trim()}
    >
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
        <LoadingLabel label={label} />
      </div>
    </div>
  );
}
