"use client";

import { SkeletonBlock, SkeletonLine } from "@/components/shared/loading";

export function AdminWorkbenchSkeleton({
  metricCount = 4,
  panelCount = 3,
}: {
  metricCount?: number;
  panelCount?: number;
}) {
  return (
    <div className="page-frame page-frame--wide w-full min-w-0">
      <div className="page-stack gap-5">
        <section className="overflow-hidden rounded-[30px] border border-orange-100/80 bg-white px-6 py-5 shadow-[0_24px_54px_-40px_rgba(15,23,42,0.28)]">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <div className="space-y-3">
              <SkeletonLine className="h-4 w-32" />
              <SkeletonLine className="h-9 w-52" />
              <SkeletonLine className="w-[30rem]" />
            </div>
            <div className="flex flex-col items-start gap-3 xl:items-end">
              <SkeletonBlock className="h-8 w-28 rounded-full" />
              <div className="flex gap-2">
                <SkeletonBlock className="h-8 w-20 rounded-full" />
                <SkeletonBlock className="h-8 w-20 rounded-full" />
                <SkeletonBlock className="h-8 w-24 rounded-full" />
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: metricCount }).map((_, index) => (
              <SkeletonBlock key={index} className="h-28 rounded-[22px]" />
            ))}
          </div>
        </section>

        <div className={`grid gap-5 ${panelCount > 2 ? "xl:grid-cols-2" : "xl:grid-cols-[minmax(0,1.18fr)_minmax(380px,0.95fr)]"}`}>
          {Array.from({ length: panelCount }).map((_, index) => (
            <section
              key={index}
              className={`rounded-[28px] border border-slate-200/90 bg-white px-5 py-5 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.22)] ${
                panelCount > 2 && index === panelCount - 1 ? "xl:col-span-2" : ""
              }`}
            >
              <div className="space-y-3 border-b border-slate-200/80 pb-4">
                <SkeletonLine className="h-3 w-24" />
                <SkeletonLine className="h-6 w-40" />
                <SkeletonLine className="w-72" />
              </div>
              <div className="mt-4 space-y-3">
                {Array.from({ length: 5 }).map((__, rowIndex) => (
                  <SkeletonBlock key={rowIndex} className="h-16 rounded-[20px]" />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminListSkeleton() {
  return <AdminWorkbenchSkeleton metricCount={4} panelCount={2} />;
}

export function AdminDashboardSkeleton() {
  return <AdminWorkbenchSkeleton metricCount={4} panelCount={3} />;
}
