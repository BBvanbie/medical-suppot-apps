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



const LABEL_PATIENT_SUMMARY = "\u60a3\u8005\u30b5\u30de\u30ea\u30fc";

const LABEL_BASIC_INFO = "\u57fa\u672c\u60c5\u5831";

const LABEL_RELATED_PERSON = "\u95a2\u4fc2\u8005";

const LABEL_PAST_HISTORY = "\u65e2\u5f80\u6b74";

const LABEL_NAME = "\u6c0f\u540d";

const LABEL_RELATION = "\u7d9a\u67c4";

const LABEL_PHONE = "\u96fb\u8a71";

const LABEL_DISEASE = "\u75be\u60a3";

const LABEL_PRIMARY_CLINIC = "\u304b\u304b\u308a\u3064\u3051";

const LABEL_SPECIAL_NOTE = "\u7279\u8a18\u4e8b\u9805";

const LABEL_DISPATCH_VITALS = "\u899a\u77e5 / \u4e3b\u8a34 / \u30d0\u30a4\u30bf\u30eb";

const LABEL_DISPATCH_SUMMARY = "\u899a\u77e5\u5185\u5bb9";

const LABEL_CHIEF_COMPLAINT = "\u4e3b\u8a34";

const LABEL_VITAL_HISTORY = "\u30d0\u30a4\u30bf\u30eb\u5c65\u6b74";

const LABEL_CHANGED_SUMMARY = "\u72b6\u614b\u5909\u5316\u30b5\u30de\u30ea\u30fc";

const LABEL_SPECIAL_NOTE_MEMO = "\u7279\u8a18\u4e8b\u9805\u30e1\u30e2";

const LABEL_CHANGED = "\u4ef6\u306e\u5909\u5316";

const LABEL_NO_CHANGE = "\u5909\u5316\u306a\u3057";



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



  return (

    <section className="space-y-5">

      <div className="rounded-2xl border border-slate-300 bg-white p-6">

        <h2 className="text-lg font-bold text-slate-800">{LABEL_PATIENT_SUMMARY}</h2>

        <p className="mt-2 text-sm text-slate-500">{headerText}</p>



        <div className="mt-4 grid grid-cols-12 gap-4">

          <div className="col-span-12 rounded-xl border border-slate-300 bg-sky-50/55 p-4">

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



            <div className="mt-3 rounded-lg border border-slate-300 bg-white p-3 text-xs text-slate-700">

              <p className="font-semibold">{LABEL_SPECIAL_NOTE}</p>

              <p className="mt-1 whitespace-pre-wrap">{specialNote}</p>

            </div>

          </div>



          <div className="col-span-12 rounded-xl border border-slate-300 bg-emerald-50/45 p-4">

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

              <div className="col-span-12 rounded-lg border border-blue-300 bg-blue-50 p-3">

                <p className="text-sm font-semibold text-blue-700">{latestVitalTitle}</p>

                <p className="mt-1 text-sm text-slate-700">{latestVitalLine}</p>

              </div>

              <div className="col-span-12">

                <p className="text-sm font-semibold text-slate-600">{LABEL_VITAL_HISTORY}</p>

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

            <p className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">{LABEL_CHANGED_SUMMARY}</p>

            <div className="mt-3 space-y-2">

              {changedFindings.map((item) => {

                const details = detailsByMajor[item.label] ?? [];

                const isOpen = openIds.includes(item.id);

                const hasChanges = item.changedCount > 0;



                return (

                  <div

                    key={item.id}

                    className={`rounded-lg border ${

                      hasChanges ? "border-amber-300 bg-white" : "border-slate-300 bg-slate-50"

                    }`}

                  >

                    <button

                      type="button"

                      onClick={() => (hasChanges ? toggleSection(item.id) : undefined)}

                      className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs ${

                        hasChanges ? "cursor-pointer" : "cursor-default"

                      }`}

                    >

                      <div>

                        <p className={`font-semibold ${hasChanges ? "text-amber-900" : "text-slate-500"}`}>{item.label}</p>

                        <p className={hasChanges ? "text-amber-700" : "text-slate-400"}>

                          {hasChanges ? `${item.changedCount}${LABEL_CHANGED}` : LABEL_NO_CHANGE}

                        </p>

                      </div>

                      {hasChanges ? <span className="text-sm text-amber-700">{isOpen ? "\uff0d" : "\uff0b"}</span> : null}

                    </button>



                    {hasChanges && isOpen ? (

                      <div className="border-t border-amber-200 bg-amber-50/40 px-3 py-2">

                        <div className="space-y-1.5">

                          {details.map((detail) => (

                            <div key={detail.id} className="rounded-md bg-white px-2.5 py-2 text-xs text-slate-700">

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



          <div className="col-span-12 rounded-xl border border-slate-300 bg-white p-4">

            <p className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{LABEL_SPECIAL_NOTE_MEMO}</p>

            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{specialNote}</p>

          </div>

        </div>

      </div>

    </section>

  );

}

