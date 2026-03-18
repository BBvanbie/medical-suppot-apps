"use client";

import type { CaseFindings, CaseFindingSectionDefinition, FindingState } from "@/lib/caseFindingsSchema";
import { isFindingDetailVisible } from "@/lib/caseFindingsSummary";

const STATE_OPTIONS: Array<{ value: Exclude<FindingState, "unselected">; label: string; tone: string }> = [
  { value: "positive", label: "\uff0b", tone: "border-rose-200 bg-rose-50 text-rose-700" },
  { value: "negative", label: "\uff0d", tone: "border-sky-200 bg-sky-50 text-sky-700" },
  { value: "unable", label: "\u78ba\u8a8d\u56f0\u96e3", tone: "border-slate-300 bg-slate-100 text-slate-700" },
];

type CaseFindingsV2PanelProps = {
  sections: readonly CaseFindingSectionDefinition[];
  findings: CaseFindings;
  onChangeItemState: (sectionId: string, itemId: string, state: FindingState) => void;
  onChangeDetail: (sectionId: string, itemId: string, detailId: string, value: string) => void;
};

export function CaseFindingsV2Panel({
  sections,
  findings,
  onChangeItemState,
  onChangeDetail,
}: CaseFindingsV2PanelProps) {
  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.id} className="rounded-xl border border-emerald-200 bg-white p-3.5">
            <h3 className="text-xs font-semibold text-slate-900">{section.label}</h3>
            <div className="mt-2.5 space-y-2.5">
              {section.items.map((itemDef) => {
                const item = findings[section.id]?.[itemDef.id];
                const itemState = item?.state ?? "unselected";
                const details = item?.details ?? {};
                return (
                  <div key={`${section.id}:${itemDef.id}`} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[13px] font-semibold text-slate-800">{itemDef.label}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {STATE_OPTIONS.map((option) => {
                          const active = itemState === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => onChangeItemState(section.id, itemDef.id, active ? "unselected" : option.value)}
                              className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${active ? option.tone : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"}`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {itemState === "positive" && itemDef.details.length > 0 ? (
                      <div className="mt-2.5 grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                        {itemDef.details
                          .filter((detailDef) => item && isFindingDetailVisible(itemDef.id, detailDef.id, item))
                          .map((detailDef) => {
                            const value = String(details[detailDef.id] ?? (detailDef.kind === "state" ? "unselected" : ""));
                            if (detailDef.kind === "state") {
                              return (
                                <div key={detailDef.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                                  <p className="text-[11px] font-semibold text-slate-500">{detailDef.label}</p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {STATE_OPTIONS.map((option) => {
                                      const active = value === option.value;
                                      return (
                                        <button
                                          key={`${detailDef.id}:${option.value}`}
                                          type="button"
                                          onClick={() => onChangeDetail(section.id, itemDef.id, detailDef.id, active ? "unselected" : option.value)}
                                          className={`rounded-md border px-2 py-1 text-[10px] font-semibold transition ${active ? option.tone : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"}`}
                                        >
                                          {option.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            }

                            if (detailDef.kind === "select") {
                              return (
                                <label key={detailDef.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                                  <span className="text-[11px] font-semibold text-slate-500">{detailDef.label}</span>
                                  <select
                                    value={value}
                                    onChange={(e) => onChangeDetail(section.id, itemDef.id, detailDef.id, e.target.value)}
                                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"
                                  >
                                    <option value="">\u9078\u629e</option>
                                    {(detailDef.options ?? []).map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              );
                            }

                            const inputType = detailDef.kind === "number" ? "number" : "text";
                            const inputMode = detailDef.kind === "number" ? "numeric" : undefined;
                            return (
                              <label key={detailDef.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                                <span className="text-[11px] font-semibold text-slate-500">{detailDef.label}</span>
                                <input
                                  type={inputType}
                                  inputMode={inputMode}
                                  value={value}
                                  onChange={(e) => onChangeDetail(section.id, itemDef.id, detailDef.id, e.target.value)}
                                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"
                                />
                              </label>
                            );
                          })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
