"use client";

import { SkeletonBlock } from "@/components/shared/loading/SkeletonBlock";
import { SkeletonLine } from "@/components/shared/loading/SkeletonLine";

type ListPageSkeletonProps = {
  rowCount?: number;
  showFilters?: boolean;
};

export function ListPageSkeleton({ rowCount = 7, showFilters = true }: ListPageSkeletonProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <SkeletonLine className="h-8 w-48" />
        <SkeletonLine className="w-80" />
      </div>
      {showFilters ? (
        <div className="ds-panel-surface grid gap-3 rounded-3xl p-4 md:grid-cols-3">
          <SkeletonBlock className="h-11" />
          <SkeletonBlock className="h-11" />
          <SkeletonBlock className="h-11" />
        </div>
      ) : null}
      <div className="ds-table-surface overflow-hidden rounded-3xl">
        <div className="ds-table-head px-4 py-3">
          <SkeletonLine className="w-32" />
        </div>
        <div className="space-y-3 p-4">
          {Array.from({ length: rowCount }).map((_, index) => (
            <div key={index} className="grid gap-3 ds-grid-skeleton-row">
              <SkeletonBlock className="h-12" />
              <SkeletonBlock className="h-12" />
              <SkeletonBlock className="h-12" />
              <SkeletonBlock className="h-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
