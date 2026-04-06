"use client";

import { BUTTON_BASE_CLASS, BUTTON_VARIANT_CLASS } from "@/components/shared/buttonStyles";

type TablePaginationProps = {
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
};

export function TablePagination({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
  className,
}: TablePaginationProps) {
  return (
    <div className={`flex items-center justify-end gap-2 ${className ?? ""}`.trim()}>
      <button
        type="button"
        onClick={onPrevious}
        disabled={currentPage === 1}
        className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.secondary} rounded-full px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:text-slate-400`}
      >
        前へ
      </button>
      <p className="text-xs text-slate-500">
        {currentPage} / {totalPages}
      </p>
      <button
        type="button"
        onClick={onNext}
        disabled={currentPage === totalPages}
        className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.secondary} rounded-full px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:text-slate-400`}
      >
        次へ
      </button>
    </div>
  );
}
