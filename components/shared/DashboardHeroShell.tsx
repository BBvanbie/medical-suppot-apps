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
  titleClassName?: string;
  descriptionClassName?: string;
  contentClassName?: string;
  bodyClassName?: string;
};

export function DashboardHeroShell({
  eyebrow,
  title,
  description,
  actions,
  children,
  className = "overflow-hidden ds-radius-display px-6 py-6 ds-shadow-panel-strong xl:px-7",
  eyebrowClassName = "ds-text-xs-compact font-semibold ds-track-hero",
  titleClassName = "mt-2 ds-text-display font-bold ds-track-display text-slate-950",
  descriptionClassName = "mt-2 max-w-3xl text-sm leading-6 text-slate-600",
  contentClassName = "flex flex-wrap items-start justify-between gap-4",
  bodyClassName = "mt-6",
}: DashboardHeroShellProps) {
  return (
    <section className={className}>
      <div className={contentClassName}>
        <div className="min-w-0">
          <p className={eyebrowClassName}>{eyebrow}</p>
          <h1 className={titleClassName}>{title}</h1>
          <div className={descriptionClassName}>{description}</div>
        </div>
        {actions}
      </div>
      {children ? <div className={bodyClassName}>{children}</div> : null}
    </section>
  );
}
