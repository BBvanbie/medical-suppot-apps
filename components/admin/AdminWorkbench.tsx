"use client";

import type { ReactNode } from "react";

type AdminWorkbenchPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  metrics?: ReactNode;
  children: ReactNode;
};

type AdminWorkbenchSectionProps = {
  kicker: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function AdminWorkbenchPage({
  eyebrow,
  title,
  description,
  action,
  metrics,
  children,
}: AdminWorkbenchPageProps) {
  return (
    <div className="page-frame page-frame--wide w-full min-w-0">
      <div className="page-stack gap-5">
        <section className="overflow-hidden rounded-[30px] border border-orange-100/80 bg-white px-6 py-5 shadow-[0_24px_54px_-40px_rgba(15,23,42,0.28)]">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.22em] text-orange-600">{eyebrow}</p>
              <h1 className="mt-2 text-[30px] font-bold tracking-[-0.03em] text-slate-950">{title}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
            </div>
            <div className="flex items-start justify-start xl:justify-end">{action}</div>
          </div>
          {metrics ? <div className="mt-5 grid gap-3 xl:grid-cols-4">{metrics}</div> : null}
        </section>
        {children}
      </div>
    </div>
  );
}

export function AdminWorkbenchSection({
  kicker,
  title,
  description,
  action,
  children,
  className = "",
}: AdminWorkbenchSectionProps) {
  return (
    <section
      className={`rounded-[28px] border border-slate-200/90 bg-white px-5 py-5 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.22)] ${className}`.trim()}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-orange-600">{kicker}</p>
          <h2 className="mt-1 text-[18px] font-bold tracking-[-0.02em] text-slate-950">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function AdminWorkbenchMetric({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint: string;
  tone?: "neutral" | "accent" | "warning";
}) {
  const toneClass =
    tone === "accent"
      ? "bg-orange-50/80 text-orange-950"
      : tone === "warning"
        ? "bg-amber-50/80 text-amber-950"
        : "bg-slate-50/80 text-slate-950";

  return (
    <article className={`rounded-[22px] px-4 py-4 ${toneClass}`}>
      <p className="text-[10px] font-semibold tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-[28px] font-bold tracking-[-0.03em]">{value}</p>
      <p className="mt-1 text-[11px] leading-5 text-slate-500">{hint}</p>
    </article>
  );
}

export function adminActionButtonClass(tone: "primary" | "secondary" | "ghost" = "secondary") {
  if (tone === "primary") {
    return "inline-flex h-10 items-center justify-center rounded-2xl bg-orange-600 px-4 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-300";
  }

  if (tone === "ghost") {
    return "inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300";
  }

  return "inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50/50 hover:text-orange-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300";
}
