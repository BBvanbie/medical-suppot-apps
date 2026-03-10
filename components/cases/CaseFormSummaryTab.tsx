"use client";

import type { ReactNode } from "react";

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

function SummaryFieldGrid({ fields }: { fields: SummaryField[] }) {
  return (
    <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-12">
      {fields.map((field) => (
        <div key={field.label} className={field.className ?? "md:col-span-3"}>
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
            className={`rounded-lg border p-3 text-xs ${
              isEmpty
                ? "border-slate-200 bg-slate-100 text-slate-400"
                : "border-slate-300 bg-white text-slate-700"
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
  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-300 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-800">患者サマリー</h2>
        <p className="mt-2 text-sm text-slate-500">{headerText}</p>

        <div className="mt-4 grid grid-cols-12 gap-4">
          <div className="col-span-12 rounded-xl border border-slate-300 bg-sky-50/55 p-4">
            <p className="rounded-md bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-800">患者基本情報</p>
            <SummaryFieldGrid fields={basicFields} />

            <SummaryMiniCards
              title={(index) => `関係者 ${index}`}
              items={relatedPeople.map((person, idx) => ({
                id: `related-${idx}`,
                rows: [
                  { label: "氏名", value: person.name },
                  { label: "関係", value: person.relation },
                  { label: "電話", value: person.phone },
                ],
              }))}
            />

            <SummaryMiniCards
              title={(index) => `既往歴 ${index}`}
              items={pastHistories.map((item, idx) => ({
                id: `history-${idx}`,
                rows: [
                  { label: "病名", value: item.disease },
                  { label: "かかりつけ", value: item.clinic },
                ],
              }))}
            />

            <div className="mt-3 rounded-lg border border-slate-300 bg-white p-3 text-xs text-slate-700">
              <p className="font-semibold">特記</p>
              <p className="mt-1 whitespace-pre-wrap">{specialNote}</p>
            </div>
          </div>

          <div className="col-span-12 rounded-xl border border-slate-300 bg-emerald-50/45 p-4">
            <p className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">要請概要 / 主訴 / 基本バイタル</p>
            <div className="mt-3 grid grid-cols-12 gap-3 text-sm">
              <div className="col-span-12">
                <span className="text-xs text-slate-500">要請概要</span>
                <p className="font-semibold text-slate-800">{dispatchSummary}</p>
              </div>
              <div className="col-span-12">
                <span className="text-xs text-slate-500">主訴</span>
                <p className="font-semibold text-slate-800">{chiefComplaint}</p>
              </div>
              <div className="col-span-12 rounded-lg border border-blue-300 bg-blue-50 p-3">
                <p className="text-sm font-semibold text-blue-700">{latestVitalTitle}</p>
                <p className="mt-1 text-sm text-slate-700">{latestVitalLine}</p>
              </div>
              <div className="col-span-12">
                <p className="text-sm font-semibold text-slate-600">時系列バイタル</p>
                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                  {vitalCards.map((card) => (
                    <div key={card.id} className="rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-700">
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

          <div className="col-span-12 rounded-xl border border-slate-300 bg-amber-50/45 p-4">
            <p className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">変更所見サマリー</p>
            <div className="mt-3 space-y-2">
              {changedFindings.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-lg border p-2 text-xs ${
                    item.changedCount > 0
                      ? "border-amber-300 bg-amber-50 text-amber-800"
                      : "border-slate-300 bg-white text-slate-500"
                  }`}
                >
                  <p className="font-semibold">{item.label}</p>
                  <p>{item.changedCount > 0 ? `${item.changedCount}件変更` : "変更なし"}</p>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <p className="text-xs font-semibold text-slate-500">変更詳細</p>
              <div className="mt-2 max-h-72 space-y-1 overflow-auto rounded-lg border border-slate-300 bg-white p-2 text-xs">
                {changedFindingDetails.length > 0 ? (
                  changedFindingDetails.map((item) => (
                    <div key={item.id} className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1">
                      <p className="text-xs font-semibold text-slate-800">
                        {item.major} &gt; {item.middle}
                      </p>
                      <div className="mt-0.5 text-xs text-slate-600">{item.detail}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500">変更なし</p>
                )}
              </div>
            </div>
          </div>

          <div className="col-span-12 rounded-xl border border-slate-300 bg-white p-4">
            <p className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">特記（基本情報）</p>
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{specialNote}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
