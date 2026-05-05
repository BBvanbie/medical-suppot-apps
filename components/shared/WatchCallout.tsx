"use client";

import type { ReactNode } from "react";

type WatchCalloutProps = {
  kicker: string;
  message: ReactNode;
  description: ReactNode;
  icon: ReactNode;
  className?: string;
  iconClassName?: string;
  kickerClassName?: string;
};

export function WatchCallout({
  kicker,
  message,
  description,
  icon,
  className = "ds-radius-panel-lg bg-white/90 px-5 py-4",
  iconClassName = "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
  kickerClassName = "ds-text-xs-compact font-semibold ds-track-eyebrow-wide",
}: WatchCalloutProps) {
  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <div className={iconClassName}>{icon}</div>
        <div className="min-w-0">
          <p className={kickerClassName}>{kicker}</p>
          <div className="mt-1 text-base font-semibold leading-6 text-slate-950">{message}</div>
          <div className="mt-1 text-xs leading-5 text-slate-500">{description}</div>
        </div>
      </div>
    </div>
  );
}
