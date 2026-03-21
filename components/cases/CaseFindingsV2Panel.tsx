"use client";

import type { CaseFindingDetailDefinition, CaseFindings, CaseFindingSectionDefinition, FindingDetailValue, FindingState } from "@/lib/caseFindingsSchema";
import { isFindingDetailVisible } from "@/lib/caseFindingsSummary";

const STATE_OPTIONS: Array<{ value: Exclude<FindingState, "unselected">; label: string; tone: string }> = [
  { value: "positive", label: "＋", tone: "border-rose-200 bg-rose-50 text-rose-700" },
  { value: "negative", label: "－", tone: "border-sky-200 bg-sky-50 text-sky-700" },
  { value: "unable", label: "確認困難", tone: "border-slate-300 bg-slate-100 text-slate-700" },
];

const SELECT_PLACEHOLDER = "選択";

function asStringArray(value: FindingDetailValue | undefined): string[] {
  return Array.isArray(value) ? value : [];
}

function normalizeDurationInput(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function toggleOption(values: string[], option: string): string[] {
  return values.includes(option) ? values.filter((value) => value !== option) : [...values, option];
}

type CaseFindingsV2PanelProps = {
  sections: readonly CaseFindingSectionDefinition[];
  findings: CaseFindings;
  onChangeItemState: (sectionId: string, itemId: string, state: FindingState) => void;
  onChangeDetail: (sectionId: string, itemId: string, detailId: string, value: FindingDetailValue) => void;
};

function renderInputLabel(detailDef: CaseFindingDetailDefinition) {
  return <span className="text-[11px] font-semibold text-slate-500">{detailDef.label}</span>;
}

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
                          .filter((detailDef) => item && isFindingDetailVisible(itemDef.id, detailDef, item))
                          .map((detailDef) => {
                            const rawValue = details[detailDef.id];
                            if (detailDef.kind === "state") {
                              const value = typeof rawValue === "string" ? rawValue : "unselected";
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
                              const value = typeof rawValue === "string" ? rawValue : "";
                              return (
                                <label key={detailDef.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                                  {renderInputLabel(detailDef)}
                                  <select
                                    value={value}
                                    onChange={(e) => onChangeDetail(section.id, itemDef.id, detailDef.id, e.target.value)}
                                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"
                                  >
                                    <option value="">{SELECT_PLACEHOLDER}</option>
                                    {(detailDef.options ?? []).map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              );
                            }

                            if (detailDef.kind === "multiselect") {
                              const values = asStringArray(rawValue);
                              return (
                                <div key={detailDef.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                                  <p className="text-[11px] font-semibold text-slate-500">{detailDef.label}</p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {(detailDef.options ?? []).map((option) => {
                                      const active = values.includes(option);
                                      return (
                                        <button
                                          key={`${detailDef.id}:${option}`}
                                          type="button"
                                          onClick={() => onChangeDetail(section.id, itemDef.id, detailDef.id, toggleOption(values, option))}
                                          className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition ${active ? "border-emerald-300 bg-emerald-100 text-emerald-800" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                                        >
                                          {option}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            }

                            const baseValue = typeof rawValue === "string" ? rawValue : "";
                            const inputType = detailDef.kind === "number" ? "number" : "text";
                            const inputMode = detailDef.kind === "number" || detailDef.kind === "duration" ? "numeric" : undefined;
                            const value = detailDef.kind === "duration" ? normalizeDurationInput(baseValue) : baseValue;
                            return (
                              <label key={detailDef.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                                {renderInputLabel(detailDef)}
                                <input
                                  type={inputType}
                                  inputMode={inputMode}
                                  placeholder={detailDef.kind === "duration" ? "MM:SS" : undefined}
                                  value={value}
                                  onChange={(e) =>
                                    onChangeDetail(
                                      section.id,
                                      itemDef.id,
                                      detailDef.id,
                                      detailDef.kind === "duration" ? normalizeDurationInput(e.target.value) : e.target.value,
                                    )
                                  }
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
