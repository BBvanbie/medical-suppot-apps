"use client";

import type { ReactNode } from "react";

type AnalyticsPageLayoutProps = {
  header: ReactNode;
  tabs?: ReactNode;
  filters?: ReactNode;
  summary?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function AnalyticsPageLayout({
  header,
  tabs,
  filters,
  summary,
  children,
  className = "page-frame page-frame--wide page-stack page-stack--lg w-full min-w-0",
  contentClassName = "grid gap-4 xl:grid-cols-2",
}: AnalyticsPageLayoutProps) {
  return (
    <div className={className}>
      {header}
      {tabs}
      {filters}
      {summary}
      <div className={contentClassName}>{children}</div>
    </div>
  );
}
