"use client";

import type { ReactNode } from "react";

type MetricPanelFrameProps = {
  kicker: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  kickerClassName?: string;
  titleClassName?: string;
  iconClassName?: string;
  bodyClassName?: string;
};

export function MetricPanelFrame({
  kicker,
  title,
  icon,
  children,
  className = "ds-radius-hero bg-white px-5 py-5 ds-shadow-panel-warm",
  headerClassName = "mb-4 flex items-start justify-between gap-3",
  kickerClassName = "ds-text-xs-compact font-semibold ds-track-eyebrow-wide text-slate-400",
  titleClassName = "mt-1 text-lg font-bold tracking-tight text-slate-900",
  iconClassName = "mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-700",
  bodyClassName,
}: MetricPanelFrameProps) {
  return (
    <section className={className}>
      <div className={headerClassName}>
        <div>
          <p className={kickerClassName}>{kicker}</p>
          <h2 className={titleClassName}>{title}</h2>
        </div>
        <div className={iconClassName}>{icon}</div>
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
