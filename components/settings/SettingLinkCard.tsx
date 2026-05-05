import Link from "next/link";
import type { ComponentType } from "react";

import { ContentCard } from "@/components/layout/ContentCard";

type SettingLinkCardProps = {
  href?: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  tone?: "ems" | "hospital" | "dispatch" | "admin";
  statusLabel?: string;
  actionLabel?: string;
};

const toneClassMap = {
  ems: {
    icon: "text-blue-600",
    eyebrow: "text-blue-600",
    hover: "hover:border-blue-200 hover:ds-shadow-primary-hover",
  },
  hospital: {
    icon: "text-emerald-600",
    eyebrow: "text-emerald-600",
    hover: "hover:border-emerald-200 hover:ds-shadow-success-hover",
  },
  dispatch: {
    icon: "text-amber-600",
    eyebrow: "text-amber-600",
    hover: "hover:border-amber-200 hover:ds-shadow-warning-hover",
  },
  admin: {
    icon: "text-orange-600",
    eyebrow: "text-orange-600",
    hover: "hover:border-orange-200 hover:ds-shadow-orange-hover",
  },
} as const;

export function SettingLinkCard({
  href,
  eyebrow,
  title,
  description,
  icon: Icon,
  tone = "ems",
  statusLabel,
  actionLabel = "この設定を開く",
}: SettingLinkCardProps) {
  const toneClasses = toneClassMap[tone];
  const content = (
    <ContentCard className={["settings-density-card group flex h-full flex-col transition", href ? toneClasses.hover : ""].join(" ").trim()}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className={`h-5 w-5 shrink-0 ${toneClasses.icon}`} aria-hidden />
          <p className={`text-xs font-semibold ds-track-eyebrow ${toneClasses.eyebrow}`}>{eyebrow}</p>
        </div>
        {statusLabel ? (
          <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">{statusLabel}</span>
        ) : null}
      </div>
      <h2 className="mt-2.5 text-lg font-bold leading-tight text-slate-900">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      {href ? <p className="mt-auto pt-4 text-sm font-semibold text-slate-700 transition group-hover:text-slate-900">{actionLabel}</p> : null}
    </ContentCard>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  );
}
