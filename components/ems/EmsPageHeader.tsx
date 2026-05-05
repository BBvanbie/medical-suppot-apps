"use client";

import Link from "next/link";

type EmsHeaderAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
};

type EmsPageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  chip?: string;
  actions?: EmsHeaderAction[];
  tone?: "standard" | "triage";
};

function HeaderActionButton({ action, tone }: { action: EmsHeaderAction; tone: "standard" | "triage" }) {
  const className =
    action.variant === "primary"
      ? [
          "inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-300",
          tone === "triage" ? "bg-rose-600 hover:bg-rose-500" : "bg-slate-950 hover:bg-slate-800",
        ].join(" ")
      : [
          "inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
          tone === "triage" ? "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50" : "bg-white/90 text-slate-700 hover:bg-white",
        ].join(" ");

  if (action.href) {
    return (
      <Link href={action.href} className={className} aria-disabled={action.disabled || undefined}>
        {action.label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={action.onClick} disabled={action.disabled} className={className}>
      {action.label}
    </button>
  );
}

export function EmsPageHeader({ eyebrow, title, description, chip, actions = [], tone = "standard" }: EmsPageHeaderProps) {
  const isTriage = tone === "triage";

  return (
    <section
      className={[
        "overflow-hidden ds-radius-panel-lg px-4 py-4 xl:px-5",
        isTriage
          ? "border border-rose-200/80 bg-white ds-shadow-emergency-header"
          : "border border-blue-100/80 bg-white ds-shadow-panel-cool",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className={`ds-text-2xs font-semibold ds-track-hero ${isTriage ? "text-rose-700" : "text-blue-500"}`}>{eyebrow}</p>
          <h1 className="mt-1.5 ds-text-title-lg font-bold ds-track-display text-slate-950">{title}</h1>
          <p className={`mt-1.5 max-w-none ds-text-xs-plus leading-5 ${isTriage ? "text-rose-900" : "text-slate-600"}`}>{description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {chip ? (
            <span className={`rounded-full px-3 py-1 ds-text-2xs font-semibold ds-track-section ${isTriage ? "bg-rose-50 text-rose-700" : "bg-white/90 text-slate-600"}`}>
              {chip}
            </span>
          ) : null}
          {actions.map((action) => (
            <HeaderActionButton key={`${action.label}-${action.href ?? "button"}`} action={action} tone={tone} />
          ))}
        </div>
      </div>
    </section>
  );
}
