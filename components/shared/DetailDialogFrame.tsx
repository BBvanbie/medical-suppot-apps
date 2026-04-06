"use client";

import type { ReactNode } from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";

import { BUTTON_BASE_CLASS, BUTTON_VARIANT_CLASS } from "@/components/shared/buttonStyles";

type DetailDialogFrameProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  kicker?: string;
  headerRight?: ReactNode;
  maxWidthClassName?: string;
  contentClassName?: string;
  dataTestId?: string;
};

export function DetailDialogFrame({
  open,
  onClose,
  children,
  title,
  kicker,
  headerRight,
  maxWidthClassName = "max-w-[1180px]",
  contentClassName,
  dataTestId,
}: DetailDialogFrameProps) {
  if (!open) return null;

  return (
    <div
      className="modal-shell-pad ds-dialog-backdrop fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
      data-testid={dataTestId}
    >
      <div
        className={`ds-dialog-surface flex max-h-[92vh] w-full ${maxWidthClassName} flex-col overflow-hidden bg-[var(--dashboard-bg)] p-4`.trim()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-3 flex items-center justify-between border-b border-slate-200 bg-[var(--dashboard-bg)] px-4 py-3">
          <div>
            {kicker ? <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">{kicker}</p> : null}
            {title ? <h3 className="mt-1 text-sm font-bold text-slate-900">{title}</h3> : null}
          </div>
          <div className="flex items-center gap-2">
            {headerRight}
            <button
              type="button"
              onClick={onClose}
              className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.secondary} h-9 w-9 rounded-lg px-0 text-slate-600`}
              aria-label="閉じる"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className={`min-h-0 flex-1 overflow-auto ${contentClassName ?? ""}`.trim()}>{children}</div>
      </div>
    </div>
  );
}
