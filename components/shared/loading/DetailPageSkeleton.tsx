"use client";

import { SkeletonBlock } from "@/components/shared/loading/SkeletonBlock";
import { SkeletonLine } from "@/components/shared/loading/SkeletonLine";

type DetailPageSkeletonProps = {
  sectionCount?: number;
  showChat?: boolean;
};

export function DetailPageSkeleton({ sectionCount = 3, showChat = true }: DetailPageSkeletonProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="space-y-3">
          <SkeletonLine className="h-8 w-56" />
          <SkeletonLine className="w-64" />
          <div className="grid gap-3 md:grid-cols-3">
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="space-y-4">
          {Array.from({ length: sectionCount }).map((_, index) => (
            <SkeletonBlock key={index} className="h-44" />
          ))}
        </div>
        {showChat ? <SkeletonBlock className="h-[32rem]" /> : null}
      </div>
    </div>
  );
}
