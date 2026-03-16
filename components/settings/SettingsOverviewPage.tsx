import type { ComponentType } from "react";

import { PageSection } from "@/components/layout/PageSection";
import { SettingCard } from "@/components/settings/SettingCard";
import { SettingLinkCard } from "@/components/settings/SettingLinkCard";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingReadOnlyBadge } from "@/components/settings/SettingReadOnlyBadge";

type LinkCard = {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
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
  tone: "ems" | "hospital";
  heroCards: [HeroCard, HeroCard, HeroCard];
  linkSectionTitle: string;
  linkSectionDescription: string;
  cards: LinkCard[];
  summarySectionTitle?: string;
  summarySectionDescription?: string;
  summaryItems?: SummaryItem[];
};

export function SettingsOverviewPage({
  eyebrow,
  title,
  description,
  tone,
  heroCards,
  linkSectionTitle,
  linkSectionDescription,
  cards,
  summarySectionTitle,
  summarySectionDescription,
  summaryItems,
}: SettingsOverviewPageProps) {
  return (
    <SettingPageLayout eyebrow={eyebrow} title={title} description={description}>
      <section className="grid gap-6 xl:grid-cols-3">
        {heroCards.map((card) => (
          <SettingCard key={card.label} className="border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-3">
              <div className="max-w-none">
                <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${card.toneClassName}`}>{card.label}</p>
                <p className="mt-3 text-xl font-bold text-slate-900">{card.title}</p>
              </div>
              {card.badge ? <SettingReadOnlyBadge>{card.badge}</SettingReadOnlyBadge> : null}
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-500">{card.description}</p>
          </SettingCard>
        ))}
      </section>

      <PageSection title={linkSectionTitle} description={linkSectionDescription} cardClassName="border-slate-200 bg-white" contentClassName="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <SettingLinkCard key={card.href} {...card} tone={tone} />
        ))}
      </PageSection>

      {summaryItems && summaryItems.length > 0 && summarySectionTitle && summarySectionDescription ? (
        <PageSection title={summarySectionTitle} description={summarySectionDescription} cardClassName="border-slate-200 bg-white" contentClassName="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {summaryItems.map((item) => (
            <div key={item.label} className="settings-density-panel rounded-2xl border border-slate-200 bg-slate-50">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{item.value}</p>
            </div>
          ))}
        </PageSection>
      ) : null}
    </SettingPageLayout>
  );
}
