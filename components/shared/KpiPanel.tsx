"use client";

import type { ReactNode } from "react";

type KpiPanelProps = {
  kicker: string;
  title: string;
  description?: string;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function KpiPanel({
  kicker,
  title,
  description,
  badge,
  children,
  className,
}: KpiPanelProps) {
  return (
    <article className={`ds-panel-surface rounded-3xl p-5 ${className ?? ""}`.trim()}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">{kicker}</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
        {badge ? <div>{badge}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </article>
  );
}
