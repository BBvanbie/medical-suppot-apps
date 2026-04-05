"use client";

import { SkeletonBlock } from "@/components/shared/loading/SkeletonBlock";
import { SkeletonLine } from "@/components/shared/loading/SkeletonLine";

type MedicalInfoGridSkeletonProps = {
  cardCount?: number;
};

export function MedicalInfoGridSkeleton({ cardCount = 8 }: MedicalInfoGridSkeletonProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <SkeletonLine className="h-8 w-36" />
        <SkeletonLine className="w-80" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: cardCount }).map((_, index) => (
          <div key={index} className="ds-panel-surface rounded-3xl p-5 shadow-sm">
            <div className="space-y-4">
              <SkeletonBlock className="h-1 w-12 rounded-full" />
              <SkeletonLine className="h-6 w-36" />
              <SkeletonLine className="w-28" />
              <SkeletonBlock className="h-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
