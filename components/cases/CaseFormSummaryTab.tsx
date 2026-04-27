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
          <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400">{item.label}</p>
          <p className="mt-1 text-[13px] font-semibold leading-5 text-slate-900">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function CompactPeople({ items }: { items: RelatedPersonSummary[] }) {
  return (
    <div className="grid gap-2 md:grid-cols-3">
      {items.map((person, idx) => (
        <div key={`related-${idx}`} className="rounded-[16px] bg-slate-50/85 px-3 py-3">
          <p className="text-[12px] font-semibold text-slate-900">{person.name}</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">
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
        <div key={`history-${idx}`} className="rounded-[16px] bg-slate-50/85 px-3 py-3">
          <p className="text-[12px] font-semibold text-slate-900">{item.disease}</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">{item.clinic}</p>
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
    <section className="rounded-[28px] border border-blue-100/80 bg-white px-5 py-5 shadow-[0_24px_54px_-42px_rgba(15,23,42,0.36)]">
      <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-200/70 pb-4">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.22em] text-blue-600">PATIENT SUMMARY</p>
          <h2 className="mt-2 text-[22px] font-bold tracking-[-0.03em] text-slate-950">患者サマリー</h2>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-blue-600">EMS REVIEW</p>
          <p className="mt-1 text-[12px] text-slate-500">基本情報 / 主訴・覚知 / バイタル</p>
        </div>
      </div>

      <section className="mt-5 rounded-[24px] border border-blue-100/80 bg-white px-5 py-5 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.14)]">
        <div className="flex items-end justify-between gap-3 border-b border-slate-200/70 pb-3">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] text-blue-600">BASIC INFORMATION</p>
            <h3 className="mt-1 text-[18px] font-bold tracking-[-0.02em] text-slate-950">基本情報</h3>
          </div>
        </div>

        <div className="mt-4">
          <MetaRail items={basicFields} />
        </div>

        <div className="mt-4">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400">CONTACTS</p>
          <div className="mt-2">
            <CompactPeople items={relatedPeople} />
          </div>
        </div>

        <div className="mt-4">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400">HISTORY</p>
          <div className="mt-2">
            <CompactHistory items={pastHistories} />
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-[22px] bg-white px-5 py-5 shadow-[0_22px_46px_-38px_rgba(15,23,42,0.24)]">
        <p className="text-[10px] font-semibold tracking-[0.18em] text-blue-600">CHIEF COMPLAINT</p>
        <h3 className="mt-1 text-[16px] font-bold tracking-[-0.02em] text-slate-950">主訴</h3>
        <p className="mt-4 whitespace-pre-wrap text-[18px] font-bold leading-8 tracking-[-0.02em] text-slate-950">{chiefComplaint}</p>
      </section>

      <section className="mt-5 rounded-[22px] bg-slate-50/80 px-5 py-5">
        <p className="text-[10px] font-semibold tracking-[0.18em] text-blue-600">DISPATCH NOTE</p>
        <h3 className="mt-1 text-[16px] font-bold tracking-[-0.02em] text-slate-950">要請内容</h3>
        <p className="mt-4 whitespace-pre-wrap text-[13px] leading-7 text-slate-700">{dispatchSummary}</p>
      </section>

      <section className="mt-5 rounded-[22px] border border-blue-100/80 bg-white px-5 py-5 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.18)]">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] text-blue-600">LATEST VITAL</p>
            <h3 className="mt-1 text-[16px] font-bold tracking-[-0.02em] text-slate-950">最新バイタル</h3>
          </div>
        </div>
        <p className="mt-4 text-[16px] font-bold tracking-[-0.02em] text-slate-950">{latestVitalTitle}</p>
        <p className="mt-2 text-[13px] leading-6 text-slate-700">{latestVitalLine}</p>
      </section>

      <section className="mt-5">
        <div className="flex items-end justify-between gap-3 border-b border-slate-200/70 pb-2">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] text-blue-600">VITAL HISTORY</p>
            <h3 className="mt-1 text-[18px] font-bold tracking-[-0.02em] text-slate-950">バイタル1〜3</h3>
          </div>
          <p className="text-[11px] text-slate-500">複数回の変化を比較</p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {vitalCards.map((card) => (
            <div key={card.id} className="rounded-[20px] bg-slate-50/85 px-4 py-4">
              <p className="text-[11px] font-semibold tracking-[0.12em] text-slate-400">{card.title}</p>
              <div className="mt-2 space-y-1">
                {card.lines.map((line, index) => (
                  <p key={`${card.id}-${index}`} className="text-[12px] leading-5 text-slate-700">
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
            <p className="text-[10px] font-semibold tracking-[0.18em] text-blue-600">STATUS CHANGES</p>
            <h3 className="mt-1 text-[16px] font-bold tracking-[-0.02em] text-slate-950">変更所見</h3>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {changedFindings.map((item) => {
            const details = detailsByMajor[item.label] ?? [];
            const isOpen = openIds.includes(item.id);
            const hasChanges = item.changedCount > 0;

            return (
              <div key={item.id} className={`rounded-[18px] ${hasChanges ? "bg-amber-50/80" : "bg-slate-50/80"}`}>
                <button
                  type="button"
                  onClick={() => (hasChanges ? toggleSection(item.id) : undefined)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left ${hasChanges ? "cursor-pointer" : "cursor-default"}`}
                >
                  <div>
                    <p className={`text-[12px] font-semibold ${hasChanges ? "text-amber-900" : "text-slate-500"}`}>{item.label}</p>
                    <p className={`mt-0.5 text-[11px] ${hasChanges ? "text-amber-700" : "text-slate-400"}`}>
                      {hasChanges ? `${item.changedCount}件の変化` : "変化なし"}
                    </p>
                  </div>
                  {hasChanges ? <span className="text-sm font-semibold text-amber-700">{isOpen ? "−" : "+"}</span> : null}
                </button>
                {hasChanges && isOpen ? (
                  <div className="space-y-2 px-4 pb-4">
                    {details.map((detail) => (
                      <div key={detail.id} className="rounded-[14px] bg-white px-3 py-3">
                        <p className="text-[12px] font-semibold text-slate-900">{detail.middle}</p>
                        <div className="mt-1 text-[11px] leading-5 text-slate-600">{detail.detail}</div>
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
          <p className="text-[10px] font-semibold tracking-[0.18em] text-blue-600">SPECIAL NOTE</p>
          <h3 className="mt-1 text-[16px] font-bold tracking-[-0.02em] text-slate-950">特記事項</h3>
        </div>
        <div className="mt-3 rounded-[20px] bg-slate-50/85 px-4 py-4">
          <p className="whitespace-pre-wrap text-[12px] leading-7 text-slate-700">{specialNote}</p>
        </div>
      </section>
    </section>
  );
}
