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
  tone: "ems" | "hospital" | "dispatch";
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
    <SettingPageLayout eyebrow={eyebrow} title={title} description={description} tone={tone}>
      <section className="grid gap-6 xl:grid-cols-3">
        {heroCards.map((card) => (
          <SettingCard
            key={card.label}
            className={
              tone === "hospital"
                ? "border-emerald-100/80 bg-white shadow-[0_18px_40px_-30px_rgba(5,150,105,0.2)]"
                : tone === "dispatch"
                  ? "border-amber-100/80 bg-white shadow-[0_18px_40px_-30px_rgba(245,158,11,0.2)]"
                  : "border-blue-100/80 bg-white shadow-[0_18px_40px_-30px_rgba(37,99,235,0.2)]"
            }
          >
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

      <PageSection
        title={linkSectionTitle}
        description={linkSectionDescription}
        cardClassName={
          tone === "hospital"
            ? "border-emerald-100/80 bg-white shadow-[0_18px_40px_-32px_rgba(15,23,42,0.22)]"
            : tone === "dispatch"
              ? "border-amber-100/80 bg-white shadow-[0_18px_40px_-32px_rgba(15,23,42,0.22)]"
              : "border-blue-100/80 bg-white shadow-[0_18px_40px_-32px_rgba(15,23,42,0.22)]"
        }
        contentClassName="grid gap-6 md:grid-cols-2 xl:grid-cols-3"
      >
        {cards.map((card) => (
          <SettingLinkCard key={`${card.href}:${card.title}`} {...card} tone={tone} />
        ))}
      </PageSection>

      {summaryItems && summaryItems.length > 0 && summarySectionTitle && summarySectionDescription ? (
        <PageSection
          title={summarySectionTitle}
          description={summarySectionDescription}
          cardClassName={
            tone === "hospital"
              ? "border-emerald-100/80 bg-white shadow-[0_18px_40px_-32px_rgba(15,23,42,0.22)]"
              : tone === "dispatch"
                ? "border-amber-100/80 bg-white shadow-[0_18px_40px_-32px_rgba(15,23,42,0.22)]"
                : "border-blue-100/80 bg-white shadow-[0_18px_40px_-32px_rgba(15,23,42,0.22)]"
          }
          contentClassName="grid gap-6 md:grid-cols-2 xl:grid-cols-4"
        >
          {summaryItems.map((item) => (
            <div
              key={item.label}
              className={
                tone === "hospital"
                  ? "settings-density-panel rounded-2xl border border-emerald-100/80 bg-emerald-50/30"
                  : tone === "dispatch"
                    ? "settings-density-panel rounded-2xl border border-amber-100/80 bg-amber-50/30"
                    : "settings-density-panel rounded-2xl border border-blue-100/80 bg-blue-50/30"
              }
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{item.value}</p>
            </div>
          ))}
        </PageSection>
      ) : null}
    </SettingPageLayout>
  );
}
