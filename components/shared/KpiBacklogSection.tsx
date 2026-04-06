"use client";

import type { ReactNode } from "react";

type KpiBacklogSectionProps = {
  summary: ReactNode;
  rail: ReactNode;
  className?: string;
  layoutClassName?: string;
};

export function KpiBacklogSection({
  summary,
  rail,
  className,
  layoutClassName = "xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.92fr)]",
}: KpiBacklogSectionProps) {
  return (
    <div className={`grid gap-4 ${layoutClassName} ${className ?? ""}`.trim()}>
      <div className="min-w-0">{summary}</div>
      <div className="grid gap-3">{rail}</div>
    </div>
  );
}
