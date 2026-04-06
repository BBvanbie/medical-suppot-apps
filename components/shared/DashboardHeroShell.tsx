"use client";

import type { ReactNode } from "react";

type DashboardHeroShellProps = {
  eyebrow: string;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  eyebrowClassName?: string;
  contentClassName?: string;
  bodyClassName?: string;
};

export function DashboardHeroShell({
  eyebrow,
  title,
  description,
  actions,
  children,
  className = "overflow-hidden rounded-[32px] px-6 py-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] xl:px-7",
  eyebrowClassName = "text-[11px] font-semibold tracking-[0.22em]",
  contentClassName = "flex flex-wrap items-start justify-between gap-4",
  bodyClassName = "mt-6",
}: DashboardHeroShellProps) {
  return (
    <section className={className}>
      <div className={contentClassName}>
        <div className="min-w-0">
          <p className={eyebrowClassName}>{eyebrow}</p>
          <h1 className="mt-2 text-[30px] font-bold tracking-[-0.03em] text-slate-950">{title}</h1>
          <div className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</div>
        </div>
        {actions}
      </div>
      {children ? <div className={bodyClassName}>{children}</div> : null}
    </section>
  );
}
