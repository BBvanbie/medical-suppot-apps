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

const LABEL_PATIENT_SUMMARY = "患者サマリー";
const LABEL_BASIC_INFO = "基本情報";
const LABEL_RELATED_PERSON = "関係者";
const LABEL_PAST_HISTORY = "既往歴";
const LABEL_NAME = "氏名";
const LABEL_RELATION = "続柄";
const LABEL_PHONE = "電話";
const LABEL_DISEASE = "疾患";
const LABEL_PRIMARY_CLINIC = "かかりつけ";
const LABEL_SPECIAL_NOTE = "特記事項";
const LABEL_DISPATCH_VITALS = "覚知 / 主訴 / バイタル";
const LABEL_DISPATCH_SUMMARY = "覚知内容";
const LABEL_CHIEF_COMPLAINT = "主訴";
const LABEL_VITAL_HISTORY = "バイタル履歴";
const LABEL_CHANGED_SUMMARY = "状態変化サマリー";
const LABEL_SPECIAL_NOTE_MEMO = "特記事項メモ";
const LABEL_CHANGED = "件の変化";
const LABEL_NO_CHANGE = "変化なし";

function SummaryFieldGrid({ fields }: { fields: SummaryField[] }) {
  return (
    <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-12">
      {fields.map((field, index) => (
        <div key={`${field.label}-${index}`} className={field.className ?? "md:col-span-3"}>
          <span className="text-xs text-slate-500">{field.label}</span>
          <p className="font-semibold text-slate-800">{field.value}</p>
        </div>
      ))}
    </div>
  );
}

function SummaryMiniCards({
  title,
  items,
}: {
  title: (index: number) => string;
  items: Array<{ id: string; rows: Array<{ label: string; value: string }> }>;
}) {
  return (
    <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
      {items.map((item, idx) => {
        const isEmpty = item.rows.every((row) => row.value === "-");

        return (
          <div
            key={item.id}
            className={`rounded-xl p-3 text-xs ring-1 ${
              isEmpty ? "bg-slate-100 text-slate-400 ring-slate-200/80" : "bg-white text-slate-700 ring-slate-200/80"
            }`}
          >
            <p className="mb-1 text-xs font-semibold">{title(idx + 1)}</p>
            {item.rows.map((row) => (
              <p key={row.label} className="mt-1 text-xs first:mt-0">
                {row.label}: <span className="font-semibold">{row.value}</span>
              </p>
            ))}
          </div>
        );
      })}
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
    <section className="space-y-5">
      <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200/80">
        <h2 className="text-lg font-bold text-slate-800">{LABEL_PATIENT_SUMMARY}</h2>

        <div className="mt-4 grid grid-cols-12 gap-4">
          <div className="col-span-12 rounded-2xl bg-sky-50/70 p-4 ring-1 ring-sky-200/70">
            <p className="rounded-md bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-800">{LABEL_BASIC_INFO}</p>
            <SummaryFieldGrid fields={basicFields} />

            <SummaryMiniCards
              title={(index) => `${LABEL_RELATED_PERSON} ${index}`}
              items={relatedPeople.map((person, idx) => ({
                id: `related-${idx}`,
                rows: [
                  { label: LABEL_NAME, value: person.name },
                  { label: LABEL_RELATION, value: person.relation },
                  { label: LABEL_PHONE, value: person.phone },
                ],
              }))}
            />

            <SummaryMiniCards
              title={(index) => `${LABEL_PAST_HISTORY} ${index}`}
              items={pastHistories.map((item, idx) => ({
                id: `history-${idx}`,
                rows: [
                  { label: LABEL_DISEASE, value: item.disease },
                  { label: LABEL_PRIMARY_CLINIC, value: item.clinic },
                ],
              }))}
            />

            <div className="mt-3 rounded-xl bg-white p-3 text-xs text-slate-700 ring-1 ring-slate-200/80">
              <p className="font-semibold">{LABEL_SPECIAL_NOTE}</p>
              <p className="mt-1 whitespace-pre-wrap">{specialNote}</p>
            </div>
          </div>

          <div className="col-span-12 rounded-2xl bg-emerald-50/55 p-4 ring-1 ring-emerald-200/70">
            <p className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">{LABEL_DISPATCH_VITALS}</p>
            <div className="mt-3 grid grid-cols-12 gap-3 text-sm">
              <div className="col-span-12">
                <span className="text-xs text-slate-500">{LABEL_DISPATCH_SUMMARY}</span>
                <p className="font-semibold text-slate-800">{dispatchSummary}</p>
              </div>
              <div className="col-span-12">
                <span className="text-xs text-slate-500">{LABEL_CHIEF_COMPLAINT}</span>
                <p className="font-semibold text-slate-800">{chiefComplaint}</p>
              </div>
              <div className="col-span-12 rounded-xl bg-white/85 p-3 ring-1 ring-blue-200/80">
                <p className="text-sm font-semibold text-blue-700">{latestVitalTitle}</p>
                <p className="mt-1 text-sm text-slate-700">{latestVitalLine}</p>
              </div>
              <div className="col-span-12">
                <p className="text-sm font-semibold text-slate-600">{LABEL_VITAL_HISTORY}</p>
                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                  {vitalCards.map((card) => (
                    <div key={card.id} className="rounded-xl bg-white p-2 text-sm text-slate-700 ring-1 ring-slate-200/80">
                      <p className="font-semibold">{card.title}</p>
                      {card.lines.map((line, index) => (
                        <p key={`${card.id}-${index}`}>{line}</p>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 rounded-2xl bg-amber-50/55 p-4 ring-1 ring-amber-200/70">
            <p className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">{LABEL_CHANGED_SUMMARY}</p>
            <div className="mt-3 space-y-2">
              {changedFindings.map((item) => {
                const details = detailsByMajor[item.label] ?? [];
                const isOpen = openIds.includes(item.id);
                const hasChanges = item.changedCount > 0;

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl ring-1 ${hasChanges ? "bg-white ring-amber-200/80" : "bg-slate-50 ring-slate-200/80"}`}
                  >
                    <button
                      type="button"
                      onClick={() => (hasChanges ? toggleSection(item.id) : undefined)}
                      className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs ${hasChanges ? "cursor-pointer" : "cursor-default"}`}
                    >
                      <div>
                        <p className={`font-semibold ${hasChanges ? "text-amber-900" : "text-slate-500"}`}>{item.label}</p>
                        <p className={hasChanges ? "text-amber-700" : "text-slate-400"}>
                          {hasChanges ? `${item.changedCount}${LABEL_CHANGED}` : LABEL_NO_CHANGE}
                        </p>
                      </div>
                      {hasChanges ? <span className="text-sm text-amber-700">{isOpen ? "－" : "＋"}</span> : null}
                    </button>

                    {hasChanges && isOpen ? (
                      <div className="border-t border-amber-200/70 bg-amber-50/30 px-3 py-2">
                        <div className="space-y-1.5">
                          {details.map((detail) => (
                            <div key={detail.id} className="rounded-lg bg-white px-2.5 py-2 text-xs text-slate-700 ring-1 ring-slate-200/80">
                              <p className="font-semibold text-slate-800">{detail.middle}</p>
                              <div className="mt-1 text-xs text-slate-700">{detail.detail}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="col-span-12 rounded-2xl bg-white p-4 ring-1 ring-slate-200/80">
            <p className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{LABEL_SPECIAL_NOTE_MEMO}</p>
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{specialNote}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
