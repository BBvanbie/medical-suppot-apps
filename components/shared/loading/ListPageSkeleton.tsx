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
        <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 md:grid-cols-3">
          <SkeletonBlock className="h-11" />
          <SkeletonBlock className="h-11" />
          <SkeletonBlock className="h-11" />
        </div>
      ) : null}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <SkeletonLine className="w-32" />
        </div>
        <div className="space-y-3 p-4">
          {Array.from({ length: rowCount }).map((_, index) => (
            <div key={index} className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_0.8fr]">
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
