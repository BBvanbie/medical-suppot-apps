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
  layoutClassName = "ds-grid-xl-kpi-backlog",
}: KpiBacklogSectionProps) {
  return (
    <div className={`grid gap-4 ${layoutClassName} ${className ?? ""}`.trim()}>
      <div className="min-w-0">{summary}</div>
      <div className="grid gap-3">{rail}</div>
    </div>
  );
}
