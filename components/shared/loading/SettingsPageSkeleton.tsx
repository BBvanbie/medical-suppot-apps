"use client";

import { SkeletonBlock } from "@/components/shared/loading/SkeletonBlock";
import { SkeletonCircle } from "@/components/shared/loading/SkeletonCircle";
import { SkeletonLine } from "@/components/shared/loading/SkeletonLine";

type SettingsPageSkeletonProps = {
  sectionCount?: number;
  rowCount?: number;
};

export function SettingsPageSkeleton({ sectionCount = 2, rowCount = 4 }: SettingsPageSkeletonProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <SkeletonLine className="h-8 w-44" />
        <SkeletonLine className="w-72" />
      </div>
      {Array.from({ length: sectionCount }).map((_, index) => (
        <div key={index} className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="space-y-4">
            <SkeletonLine className="h-6 w-40" />
            {Array.from({ length: rowCount }).map((__, rowIndex) => (
              <div key={rowIndex} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                <div className="min-w-0 flex-1 space-y-2">
                  <SkeletonLine className="w-40" />
                  <SkeletonLine className="w-64" />
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <SkeletonBlock className="h-10 w-28" />
                  <SkeletonCircle className="h-6 w-12" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
