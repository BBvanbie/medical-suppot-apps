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
};

function HeaderActionButton({ action }: { action: EmsHeaderAction }) {
  const className =
    action.variant === "primary"
      ? "inline-flex h-10 items-center rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      : "inline-flex h-10 items-center rounded-full bg-white/90 px-4 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60";

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

export function EmsPageHeader({ eyebrow, title, description, chip, actions = [] }: EmsPageHeaderProps) {
  return (
    <section className="overflow-hidden rounded-[26px] bg-[linear-gradient(135deg,#eff6ff_0%,#f8fafc_42%,#dbeafe_100%)] px-4 py-4 shadow-[0_18px_42px_-34px_rgba(37,99,235,0.26)] xl:px-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold tracking-[0.22em] text-blue-500">{eyebrow}</p>
          <h1 className="mt-1.5 text-[24px] font-bold tracking-[-0.03em] text-slate-950">{title}</h1>
          <p className="mt-1.5 max-w-none text-[12px] leading-5 text-slate-600">{description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {chip ? (
            <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold tracking-[0.14em] text-slate-600">
              {chip}
            </span>
          ) : null}
          {actions.map((action) => (
            <HeaderActionButton key={`${action.label}-${action.href ?? "button"}`} action={action} />
          ))}
        </div>
      </div>
    </section>
  );
}
