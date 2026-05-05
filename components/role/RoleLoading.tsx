"use client";

import { SkeletonBlock, SkeletonLine } from "@/components/shared/loading";

type RoleTone = "ems" | "hospital" | "dispatch";

function toneClasses(tone: RoleTone) {
  if (tone === "hospital") {
    return { border: "border-emerald-100/80", soft: "bg-slate-50/85" };
  }
  if (tone === "dispatch") {
    return { border: "border-amber-100/80", soft: "bg-slate-50/85" };
  }
  return { border: "border-blue-100/80", soft: "bg-slate-50/85" };
}

export function RoleWorkbenchSkeleton({
  tone,
  metricCount = 4,
  panelCount = 3,
}: {
  tone: RoleTone;
  metricCount?: number;
  panelCount?: number;
}) {
  const styles = toneClasses(tone);

  return (
    <div className="page-frame page-frame--wide w-full min-w-0">
      <div className="page-stack gap-5">
        <section className={`overflow-hidden ds-radius-display border bg-white px-6 py-5 ds-shadow-hero-neutral ${styles.border}`}>
          <div className="grid gap-5 ds-grid-xl-role-loading">
            <div className="space-y-3">
              <SkeletonLine className="h-4 w-32" />
              <SkeletonLine className="h-9 w-52" />
              <SkeletonLine className="ds-w-skeleton-title" />
            </div>
            <div className="flex flex-col items-start gap-3 xl:items-end">
              <SkeletonBlock className="h-8 w-28 rounded-full" />
              <div className="flex gap-2">
                <SkeletonBlock className="h-8 w-20 rounded-full" />
                <SkeletonBlock className="h-8 w-20 rounded-full" />
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: metricCount }).map((_, index) => (
              <SkeletonBlock key={index} className={`h-28 ds-radius-command ${styles.soft}`} />
            ))}
          </div>
        </section>

        <div className={`grid gap-5 ${panelCount > 2 ? "xl:grid-cols-2" : "xl:ds-grid-command-main"}`}>
          {Array.from({ length: panelCount }).map((_, index) => (
            <section
              key={index}
              className={`ds-radius-hero border border-slate-200/90 bg-white px-5 py-5 ds-shadow-card-subtle ${
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
                  <SkeletonBlock key={rowIndex} className={`h-16 ds-radius-section ${styles.soft}`} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export function EmsWorkbenchSkeleton(props: { metricCount?: number; panelCount?: number }) {
  return <RoleWorkbenchSkeleton tone="ems" {...props} />;
}

export function HospitalWorkbenchSkeleton(props: { metricCount?: number; panelCount?: number }) {
  return <RoleWorkbenchSkeleton tone="hospital" {...props} />;
}

export function DispatchWorkbenchSkeleton(props: { metricCount?: number; panelCount?: number }) {
  return <RoleWorkbenchSkeleton tone="dispatch" {...props} />;
}
