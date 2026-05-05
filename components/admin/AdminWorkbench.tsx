"use client";

import type { ReactNode } from "react";
import { BUTTON_BASE_CLASS, BUTTON_VARIANT_CLASS } from "@/components/shared/buttonStyles";

type AdminWorkbenchPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  metrics?: ReactNode;
  children: ReactNode;
  tone?: "admin" | "dispatch" | "ems" | "hospital";
};

type AdminWorkbenchSectionProps = {
  kicker: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: "admin" | "dispatch" | "ems" | "hospital";
};

const toneClassMap = {
  ems: {
    eyebrow: "text-blue-600",
    kicker: "text-blue-600",
    metricAccent: "bg-blue-50/80 text-blue-950",
    metricWarning: "bg-amber-50/80 text-amber-950",
  },
  hospital: {
    eyebrow: "text-emerald-600",
    kicker: "text-emerald-600",
    metricAccent: "bg-emerald-50/80 text-emerald-950",
    metricWarning: "bg-amber-50/80 text-amber-950",
  },
  admin: {
    eyebrow: "text-orange-600",
    kicker: "text-orange-600",
    metricAccent: "bg-orange-50/80 text-orange-950",
    metricWarning: "bg-amber-50/80 text-amber-950",
  },
  dispatch: {
    eyebrow: "text-amber-600",
    kicker: "text-amber-600",
    metricAccent: "bg-amber-50/80 text-amber-950",
    metricWarning: "bg-orange-50/80 text-orange-950",
  },
} as const;

export function AdminWorkbenchPage({
  eyebrow,
  title,
  description,
  action,
  metrics,
  children,
  tone = "admin",
}: AdminWorkbenchPageProps) {
  const toneClasses = toneClassMap[tone];
  return (
    <div className="page-frame page-frame--wide w-full min-w-0">
      <div className="page-stack gap-5">
        <section className="ds-panel-surface ds-panel-surface--hero overflow-hidden px-6 py-5">
          <div className="grid gap-5 xl:ds-grid-main-side-tight">
            <div className="min-w-0">
              <p className={`ds-text-xs-compact font-semibold ds-track-hero ${toneClasses.eyebrow}`}>{eyebrow}</p>
              <h1 className="mt-2 ds-text-display font-bold ds-track-display text-slate-950">{title}</h1>
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
  tone = "admin",
}: AdminWorkbenchSectionProps) {
  const toneClasses = toneClassMap[tone];
  return (
    <section
      className={`ds-panel-surface px-5 py-5 ${className}`.trim()}
    >
      <div className="ds-panel-header flex flex-wrap items-start justify-between gap-4 pb-4">
        <div className="min-w-0">
          <p className={`ds-text-2xs font-semibold ds-track-eyebrow-wide ${toneClasses.kicker}`}>{kicker}</p>
          <h2 className="mt-1 ds-text-xl-compact font-bold ds-track-title text-slate-950">{title}</h2>
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
  palette = "admin",
}: {
  label: string;
  value: string | number;
  hint: string;
  tone?: "neutral" | "accent" | "warning";
  palette?: "admin" | "dispatch" | "ems" | "hospital";
}) {
  const toneClasses = toneClassMap[palette];
  const toneClass =
    tone === "accent"
      ? toneClasses.metricAccent
      : tone === "warning"
        ? toneClasses.metricWarning
        : "bg-slate-50/80 text-slate-950";

  return (
    <article className={`ds-radius-command px-4 py-4 ${toneClass}`}>
      <p className="ds-text-2xs font-semibold ds-track-eyebrow-wide text-slate-500">{label}</p>
      <p className="mt-2 ds-text-display-md font-bold ds-track-display">{value}</p>
      <p className="mt-1 ds-text-xs-compact leading-5 text-slate-500">{hint}</p>
    </article>
  );
}

export function adminActionButtonClass(tone: "primary" | "secondary" | "ghost" = "secondary") {
  if (tone === "primary") {
    return `${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.primary}`;
  }

  if (tone === "ghost") {
    return "inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300";
  }

  return `${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.secondary}`;
}
