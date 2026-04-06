"use client";

import type { ReactNode } from "react";

type SectionPanelFrameProps = {
  kicker: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  kickerClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  bodyClassName?: string;
};

export function SectionPanelFrame({
  kicker,
  title,
  description,
  actions,
  children,
  className = "rounded-[26px] bg-white px-5 py-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.22)]",
  headerClassName = "flex flex-wrap items-start justify-between gap-3",
  kickerClassName = "text-[10px] font-semibold tracking-[0.18em] text-slate-400",
  titleClassName = "mt-1 text-base font-bold tracking-tight text-slate-900",
  descriptionClassName = "mt-2 text-[12px] leading-6 text-slate-500",
  bodyClassName,
}: SectionPanelFrameProps) {
  return (
    <section className={className}>
      <div className={headerClassName}>
        <div>
          <p className={kickerClassName}>{kicker}</p>
          <h2 className={titleClassName}>{title}</h2>
          {description ? <div className={descriptionClassName}>{description}</div> : null}
        </div>
        {actions}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
