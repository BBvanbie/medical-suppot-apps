"use client";

import { SkeletonBlock } from "@/components/shared/loading/SkeletonBlock";
import { SkeletonLine } from "@/components/shared/loading/SkeletonLine";

type DashboardPageSkeletonProps = {
  summaryCount?: number;
  panelCount?: number;
};

export function DashboardPageSkeleton({ summaryCount = 4, panelCount = 3 }: DashboardPageSkeletonProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <SkeletonLine className="h-8 w-40" />
        <SkeletonLine className="w-72" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: summaryCount }).map((_, index) => (
          <SkeletonBlock key={index} className="h-28" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {Array.from({ length: panelCount }).map((_, index) => (
          <SkeletonBlock key={index} className="h-64" />
        ))}
      </div>
    </div>
  );
}
