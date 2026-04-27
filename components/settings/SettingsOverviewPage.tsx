import type { ComponentType } from "react";

import { PageSection } from "@/components/layout/PageSection";
import { SettingCard } from "@/components/settings/SettingCard";
import { SettingLinkCard } from "@/components/settings/SettingLinkCard";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingReadOnlyBadge } from "@/components/settings/SettingReadOnlyBadge";

type LinkCard = {
  href?: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  statusLabel?: string;
  actionLabel?: string;
};

type SummaryItem = {
  label: string;
  value: string;
};

type HeroCard = {
  label: string;
  title: string;
  description: string;
  toneClassName: string;
  badge?: string;
};

type SettingsOverviewPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  tone: "ems" | "hospital" | "dispatch" | "admin";
  operationTone?: "standard" | "triage";
  heroCards: [HeroCard, HeroCard, HeroCard];
  linkSectionTitle: string;
  linkSectionDescription: string;
  cards: LinkCard[];
  summarySectionTitle?: string;
  summarySectionDescription?: string;
  summaryItems?: SummaryItem[];
};

const toneClassMap = {
  ems: {
    card: "border-blue-100/80 bg-white shadow-[0_18px_40px_-30px_rgba(37,99,235,0.2)]",
    section: "border-blue-100/80 bg-white shadow-[0_18px_40px_-32px_rgba(15,23,42,0.22)]",
    summary: "border-blue-100/80 bg-blue-50/30",
  },
  hospital: {
    card: "border-emerald-100/80 bg-white shadow-[0_18px_40px_-30px_rgba(5,150,105,0.2)]",
    section: "border-emerald-100/80 bg-white shadow-[0_18px_40px_-32px_rgba(15,23,42,0.22)]",
    summary: "border-emerald-100/80 bg-emerald-50/30",
  },
  dispatch: {
    card: "border-amber-100/80 bg-white shadow-[0_18px_40px_-30px_rgba(245,158,11,0.2)]",
    section: "border-amber-100/80 bg-white shadow-[0_18px_40px_-32px_rgba(15,23,42,0.22)]",
    summary: "border-amber-100/80 bg-amber-50/30",
  },
  admin: {
    card: "border-orange-100/80 bg-white shadow-[0_18px_40px_-30px_rgba(249,115,22,0.2)]",
    section: "border-orange-100/80 bg-white shadow-[0_18px_40px_-32px_rgba(15,23,42,0.22)]",
    summary: "border-orange-100/80 bg-orange-50/30",
  },
} as const;

export function SettingsOverviewPage({
  eyebrow,
  title,
  description,
  tone,
  operationTone = "standard",
  heroCards,
  linkSectionTitle,
  linkSectionDescription,
  cards,
  summarySectionTitle,
  summarySectionDescription,
  summaryItems,
}: SettingsOverviewPageProps) {
  const toneClasses = toneClassMap[tone];
  const isEmsTriage = tone === "ems" && operationTone === "triage";

  return (
    <SettingPageLayout eyebrow={eyebrow} title={title} description={description} tone={tone} operationTone={operationTone}>
      <section className="grid gap-4 xl:grid-cols-3">
        {heroCards.map((card) => (
          <SettingCard key={card.label} className={["ems-settings-summary-card", isEmsTriage ? "border-rose-200 bg-white text-slate-900 shadow-[0_18px_40px_-30px_rgba(190,24,93,0.32)]" : toneClasses.card].join(" ")}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${card.toneClassName}`}>{card.label}</p>
                <p className="mt-2 text-xl font-bold leading-tight text-slate-900">{card.title}</p>
              </div>
              {card.badge ? <SettingReadOnlyBadge>{card.badge}</SettingReadOnlyBadge> : null}
            </div>
            <p className={`mt-2.5 text-sm leading-6 ${isEmsTriage ? "text-rose-900" : "text-slate-500"}`}>{card.description}</p>
          </SettingCard>
        ))}
      </section>

      <PageSection
        title={linkSectionTitle}
        description={linkSectionDescription}
        cardClassName={isEmsTriage ? "border-rose-200 bg-white text-slate-900 shadow-[0_18px_40px_-32px_rgba(190,24,93,0.28)]" : toneClasses.section}
        contentClassName="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        {cards.map((card) => (
          <SettingLinkCard key={`${card.href}:${card.title}`} {...card} tone={tone} />
        ))}
      </PageSection>

      {summaryItems && summaryItems.length > 0 && summarySectionTitle && summarySectionDescription ? (
        <PageSection
          title={summarySectionTitle}
          description={summarySectionDescription}
          cardClassName={isEmsTriage ? "border-rose-200 bg-white text-slate-900 shadow-[0_18px_40px_-32px_rgba(190,24,93,0.28)]" : toneClasses.section}
          contentClassName="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          {summaryItems.map((item) => (
            <div key={item.label} className={`settings-density-panel rounded-2xl border ${toneClasses.summary}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{item.value}</p>
            </div>
          ))}
        </PageSection>
      ) : null}
    </SettingPageLayout>
  );
}
