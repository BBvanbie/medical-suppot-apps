import Link from "next/link";
import type { ComponentType } from "react";

import { ContentCard } from "@/components/layout/ContentCard";

type SettingLinkCardProps = {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  tone?: "ems" | "hospital";
};

const toneClassMap = {
  ems: {
    icon: "text-blue-600",
    eyebrow: "text-blue-600",
    hover: "hover:border-blue-200 hover:shadow-[0_24px_44px_-28px_rgba(37,99,235,0.3)]",
  },
  hospital: {
    icon: "text-emerald-600",
    eyebrow: "text-emerald-600",
    hover: "hover:border-emerald-200 hover:shadow-[0_24px_44px_-28px_rgba(5,150,105,0.3)]",
  },
} as const;

export function SettingLinkCard({ href, eyebrow, title, description, icon: Icon, tone = "ems" }: SettingLinkCardProps) {
  const toneClasses = toneClassMap[tone];

  return (
    <Link href={href} className="block">
      <ContentCard className={["settings-density-card group transition", toneClasses.hover].join(" ")}>
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${toneClasses.icon}`} aria-hidden />
          <p className={`text-xs font-semibold tracking-[0.16em] ${toneClasses.eyebrow}`}>{eyebrow}</p>
        </div>
        <h2 className="mt-3 text-lg font-bold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm leading-7 text-slate-500">{description}</p>
      </ContentCard>
    </Link>
  );
}
