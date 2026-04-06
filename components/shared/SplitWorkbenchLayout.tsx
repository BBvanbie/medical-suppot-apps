"use client";

import type { ReactNode } from "react";

type SplitWorkbenchLayoutProps = {
  primary: ReactNode;
  secondary: ReactNode;
  className?: string;
  layoutClassName?: string;
};

export function SplitWorkbenchLayout({
  primary,
  secondary,
  className,
  layoutClassName = "xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.92fr)]",
}: SplitWorkbenchLayoutProps) {
  return (
    <div className={`grid gap-5 ${layoutClassName} ${className ?? ""}`.trim()}>
      <div className="min-w-0 space-y-5">{primary}</div>
      <div className="min-w-0">{secondary}</div>
    </div>
  );
}
