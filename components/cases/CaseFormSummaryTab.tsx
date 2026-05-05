"use client";

import { useState, type ReactNode } from "react";

type SummaryField = {
  label: string;
  value: string;
  className?: string;
};

type RelatedPersonSummary = {
  name: string;
  relation: string;
  phone: string;
};

type PastHistorySummary = {
  disease: string;
  clinic: string;
};

type VitalSummaryCard = {
  id: string;
  title: string;
  lines: string[];
};

type ChangedFindingSummary = {
  id: string;
  label: string;
  changedCount: number;
};

type ChangedFindingDetail = {
  id: string;
  major: string;
  middle: string;
  detail: ReactNode;
};

type CaseFormSummaryTabProps = {
  headerText: string;
  basicFields: SummaryField[];
  relatedPeople: RelatedPersonSummary[];
  pastHistories: PastHistorySummary[];
  specialNote: string;
  dispatchSummary: string;
  chiefComplaint: string;
  latestVitalTitle: string;
  latestVitalLine: string;
  vitalCards: VitalSummaryCard[];
  changedFindings: ChangedFindingSummary[];
  changedFindingDetails: ChangedFindingDetail[];
};

function MetaRail({ items }: { items: SummaryField[] }) {
  return (
    <div className="grid gap-x-5 gap-y-3 border-b border-slate-200/70 pb-4 md:grid-cols-3 xl:grid-cols-5">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="min-w-0">
          <p className="ds-text-2xs font-semibold ds-track-eyebrow text-slate-400">{item.label}</p>
          <p className="mt-1 ds-text-sm-compact font-semibold leading-5 text-slate-900">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function CompactPeople({ items }: { items: RelatedPersonSummary[] }) {
  return (
    <div className="grid gap-2 md:grid-cols-3">
      {items.map((person, idx) => (
        <div key={`related-${idx}`} className="rounded-2xl bg-slate-50/85 px-3 py-3">
          <p className="ds-text-xs-plus font-semibold text-slate-900">{person.name}</p>
          <p className="mt-1 ds-text-xs-compact leading-5 text-slate-500">
            {person.relation} / {person.phone}
          </p>
        </div>
      ))}
    </div>
  );
}

function CompactHistory({ items }: { items: PastHistorySummary[] }) {
  return (
    <div className="grid gap-2 md:grid-cols-3">
      {items.map((item, idx) => (
        <div key={`history-${idx}`} className="rounded-2xl bg-slate-50/85 px-3 py-3">
          <p className="ds-text-xs-plus font-semibold text-slate-900">{item.disease}</p>
          <p className="mt-1 ds-text-xs-compact leading-5 text-slate-500">{item.clinic}</p>
        </div>
      ))}
    </div>
  );
}

export function CaseFormSummaryTab({
  headerText,
  basicFields,
  relatedPeople,
  pastHistories,
  specialNote,
  dispatchSummary,
  chiefComplaint,
  latestVitalTitle,
  latestVitalLine,
  vitalCards,
  changedFindings,
  changedFindingDetails,
}: CaseFormSummaryTabProps) {
  const initialOpenIds = changedFindings.filter((item) => item.changedCount > 0).slice(0, 1).map((item) => item.id);
  const [openIds, setOpenIds] = useState<string[]>(initialOpenIds);

  const detailsByMajor = changedFindingDetails.reduce<Record<string, ChangedFindingDetail[]>>((acc, item) => {
    if (!acc[item.major]) acc[item.major] = [];
    acc[item.major].push(item);
    return acc;
  }, {});

  const toggleSection = (id: string) => {
    setOpenIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  void headerText;

  return (
    <section className="ds-radius-hero border border-blue-100/80 bg-white px-5 py-5 ds-shadow-hero-neutral-strong">
      <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-200/70 pb-4">
        <div>
          <p className="ds-text-2xs font-semibold ds-track-hero text-blue-600">PATIENT SUMMARY</p>
          <h2 className="mt-2 ds-text-title font-bold ds-track-display text-slate-950">患者サマリー</h2>
        </div>
        <div className="text-right">
          <p className="ds-text-2xs font-semibold ds-track-eyebrow text-blue-600">EMS REVIEW</p>
          <p className="mt-1 ds-text-xs-plus text-slate-500">基本情報 / 主訴・覚知 / バイタル</p>
        </div>
      </div>

      <section className="mt-5 ds-radius-panel border border-blue-100/80 bg-white px-5 py-5 ds-shadow-inset-slate">
        <div className="flex items-end justify-between gap-3 border-b border-slate-200/70 pb-3">
          <div>
            <p className="ds-text-2xs font-semibold ds-track-eyebrow-wide text-blue-600">BASIC INFORMATION</p>
            <h3 className="mt-1 ds-text-xl-compact font-bold ds-track-title text-slate-950">基本情報</h3>
          </div>
        </div>

        <div className="mt-4">
          <MetaRail items={basicFields} />
        </div>

        <div className="mt-4">
          <p className="ds-text-2xs font-semibold ds-track-eyebrow text-slate-400">CONTACTS</p>
          <div className="mt-2">
            <CompactPeople items={relatedPeople} />
          </div>
        </div>

        <div className="mt-4">
          <p className="ds-text-2xs font-semibold ds-track-eyebrow text-slate-400">HISTORY</p>
          <div className="mt-2">
            <CompactHistory items={pastHistories} />
          </div>
        </div>
      </section>

      <section className="mt-5 ds-radius-command bg-white px-5 py-5 ds-shadow-summary-soft">
        <p className="ds-text-2xs font-semibold ds-track-eyebrow-wide text-blue-600">CHIEF COMPLAINT</p>
        <h3 className="mt-1 ds-text-lg-compact font-bold ds-track-title text-slate-950">主訴</h3>
        <p className="mt-4 whitespace-pre-wrap ds-text-xl-compact font-bold leading-8 ds-track-title text-slate-950">{chiefComplaint}</p>
      </section>

      <section className="mt-5 ds-radius-command bg-slate-50/80 px-5 py-5">
        <p className="ds-text-2xs font-semibold ds-track-eyebrow-wide text-blue-600">DISPATCH NOTE</p>
        <h3 className="mt-1 ds-text-lg-compact font-bold ds-track-title text-slate-950">要請内容</h3>
        <p className="mt-4 whitespace-pre-wrap ds-text-sm-compact leading-7 text-slate-700">{dispatchSummary}</p>
      </section>

      <section className="mt-5 ds-radius-command border border-blue-100/80 bg-white px-5 py-5 ds-shadow-inset-slate-strong">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="ds-text-2xs font-semibold ds-track-eyebrow-wide text-blue-600">LATEST VITAL</p>
            <h3 className="mt-1 ds-text-lg-compact font-bold ds-track-title text-slate-950">最新バイタル</h3>
          </div>
        </div>
        <p className="mt-4 ds-text-lg-compact font-bold ds-track-title text-slate-950">{latestVitalTitle}</p>
        <p className="mt-2 ds-text-sm-compact leading-6 text-slate-700">{latestVitalLine}</p>
      </section>

      <section className="mt-5">
        <div className="flex items-end justify-between gap-3 border-b border-slate-200/70 pb-2">
          <div>
            <p className="ds-text-2xs font-semibold ds-track-eyebrow-wide text-blue-600">VITAL HISTORY</p>
            <h3 className="mt-1 ds-text-xl-compact font-bold ds-track-title text-slate-950">バイタル1〜3</h3>
          </div>
          <p className="ds-text-xs-compact text-slate-500">複数回の変化を比較</p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {vitalCards.map((card) => (
            <div key={card.id} className="ds-radius-section bg-slate-50/85 px-4 py-4">
              <p className="ds-text-xs-compact font-semibold ds-track-label text-slate-400">{card.title}</p>
              <div className="mt-2 space-y-1">
                {card.lines.map((line, index) => (
                  <p key={`${card.id}-${index}`} className="ds-text-xs-plus leading-5 text-slate-700">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <div className="flex items-end justify-between gap-3 border-b border-slate-200/70 pb-2">
          <div>
            <p className="ds-text-2xs font-semibold ds-track-eyebrow-wide text-blue-600">STATUS CHANGES</p>
            <h3 className="mt-1 ds-text-lg-compact font-bold ds-track-title text-slate-950">変更所見</h3>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {changedFindings.map((item) => {
            const details = detailsByMajor[item.label] ?? [];
            const isOpen = openIds.includes(item.id);
            const hasChanges = item.changedCount > 0;

            return (
              <div key={item.id} className={`ds-radius-callout ${hasChanges ? "bg-amber-50/80" : "bg-slate-50/80"}`}>
                <button
                  type="button"
                  onClick={() => (hasChanges ? toggleSection(item.id) : undefined)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left ${hasChanges ? "cursor-pointer" : "cursor-default"}`}
                >
                  <div>
                    <p className={`ds-text-xs-plus font-semibold ${hasChanges ? "text-amber-900" : "text-slate-500"}`}>{item.label}</p>
                    <p className={`mt-0.5 ds-text-xs-compact ${hasChanges ? "text-amber-700" : "text-slate-400"}`}>
                      {hasChanges ? `${item.changedCount}件の変化` : "変化なし"}
                    </p>
                  </div>
                  {hasChanges ? <span className="text-sm font-semibold text-amber-700">{isOpen ? "−" : "+"}</span> : null}
                </button>
                {hasChanges && isOpen ? (
                  <div className="space-y-2 px-4 pb-4">
                    {details.map((detail) => (
                      <div key={detail.id} className="ds-radius-compact bg-white px-3 py-3">
                        <p className="ds-text-xs-plus font-semibold text-slate-900">{detail.middle}</p>
                        <div className="mt-1 ds-text-xs-compact leading-5 text-slate-600">{detail.detail}</div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-5 border-t border-slate-200/70 pt-4">
        <div>
          <p className="ds-text-2xs font-semibold ds-track-eyebrow-wide text-blue-600">SPECIAL NOTE</p>
          <h3 className="mt-1 ds-text-lg-compact font-bold ds-track-title text-slate-950">特記事項</h3>
        </div>
        <div className="mt-3 ds-radius-section bg-slate-50/85 px-4 py-4">
          <p className="whitespace-pre-wrap ds-text-xs-plus leading-7 text-slate-700">{specialNote}</p>
        </div>
      </section>
    </section>
  );
}
