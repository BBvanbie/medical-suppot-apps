"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type ActionLinkItem = {
  href: string;
  label: string;
  description: string;
  icon: ReactNode;
};

type ActionLinkPanelProps = {
  kicker: string;
  title: string;
  badge?: string;
  items: ActionLinkItem[];
  columnsClassName?: string;
  panelClassName?: string;
  itemClassName?: string;
  itemIconClassName?: string;
};

export function ActionLinkPanel({
  kicker,
  title,
  badge,
  items,
  columnsClassName = "sm:grid-cols-2",
  panelClassName = "rounded-[28px] bg-white px-5 py-5 shadow-[0_20px_44px_-36px_rgba(15,23,42,0.28)]",
  itemClassName = "group rounded-[20px] bg-slate-50/90 px-4 py-3 transition hover:bg-slate-100",
  itemIconClassName = "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700",
}: ActionLinkPanelProps) {
  return (
    <section className={panelClassName}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-400">{kicker}</p>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900">{title}</h2>
        </div>
        {badge ? <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">{badge}</span> : null}
      </div>
      <div className={`grid gap-2.5 ${columnsClassName}`.trim()}>
        {items.map((item) => (
          <Link key={item.href} href={item.href} className={itemClassName}>
            <div className="flex items-start gap-3">
              <div className={itemIconClassName}>
                {item.icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">{item.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
