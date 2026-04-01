"use client";

import { CameraIcon, CheckCircleIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

import type { CaseFindingDetailDefinition, CaseFindings, CaseFindingSectionDefinition, FindingDetailValue, FindingState } from "@/lib/caseFindingsSchema";
import { isFindingDetailVisible } from "@/lib/caseFindingsSummary";
import { getTraumaItemNumber, getTraumaSiteOptions, isTraumaItemId } from "@/lib/traumaFindings";

const STATE_OPTIONS: Array<{ value: Exclude<FindingState, "unselected">; label: string; tone: string }> = [
  { value: "positive", label: "＋", tone: "border-rose-200 bg-rose-50 text-rose-700" },
  { value: "negative", label: "－", tone: "border-sky-200 bg-sky-50 text-sky-700" },
  { value: "unable", label: "確認困難", tone: "border-slate-300 bg-slate-100 text-slate-700" },
];

const SELECT_PLACEHOLDER = "選択";
const TRAUMA_BUTTON_STATES: Array<{ value: "positive" | "negative"; label: string; tone: string }> = [
  { value: "positive", label: "+", tone: "border-rose-200 bg-rose-50 text-rose-700" },
  { value: "negative", label: "-", tone: "border-sky-200 bg-sky-50 text-sky-700" },
];
const TRAUMA_SUTURE_BUTTON_STATES: Array<{ value: "positive" | "negative" | "unable"; label: string; tone: string }> = [
  { value: "positive", label: "+", tone: "border-rose-200 bg-rose-50 text-rose-700" },
  { value: "negative", label: "-", tone: "border-sky-200 bg-sky-50 text-sky-700" },
  { value: "unable", label: "△", tone: "border-slate-300 bg-slate-100 text-slate-700" },
];

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

function renderInputLabel(detailDef: CaseFindingDetailDefinition) {
  return <span className="block text-[11px] font-semibold leading-none text-slate-500">{detailDef.label}</span>;
}

function hasTraumaValue(value: FindingDetailValue | undefined): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value !== "string") return false;
  return value !== "" && value !== "unselected";
}

function shouldUseFourColumnLayout(itemDef: CaseFindingSectionDefinition["items"][number]) {
  return !itemDef.details.some((detailDef) => {
    if (detailDef.kind === "multiselect") return true;
    const longestOption = Math.max(...(detailDef.options ?? []).map((option) => option.length), 0);
    return longestOption >= 8;
  });
}

function TraumaBinaryButtonGroup({
  value,
  onChange,
  options = TRAUMA_BUTTON_STATES,
}: {
  value: string;
  onChange: (value: string) => void;
  options?: ReadonlyArray<{ value: string; label: string; tone: string }>;
}) {
  return (
    <div className="flex min-w-[72px] gap-1">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(active ? "unselected" : option.value)}
            className={`h-8 min-w-[32px] rounded-md border px-2 text-[11px] font-semibold transition ${active ? option.tone : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

type CaseFindingsV2PanelProps = {
  sections: readonly CaseFindingSectionDefinition[];
  findings: CaseFindings;
  onChangeItemState: (sectionId: string, itemId: string, state: FindingState) => void;
  onChangeDetail: (sectionId: string, itemId: string, detailId: string, value: FindingDetailValue) => void;
};

function TraumaRow({
  sectionId,
  itemId,
  label,
  details,
  onChangeItemState,
  onChangeDetail,
}: {
  sectionId: string;
  itemId: string;
  label: string;
  details: Record<string, FindingDetailValue>;
  onChangeItemState: (sectionId: string, itemId: string, state: FindingState) => void;
  onChangeDetail: (sectionId: string, itemId: string, detailId: string, value: FindingDetailValue) => void;
}) {
  const region = typeof details.region === "string" ? details.region : "";
  const site = typeof details.site === "string" ? details.site : "";
  const siteOther = typeof details.siteOther === "string" ? details.siteOther : "";
  const size = typeof details.size === "string" ? details.size : "";
  const bleeding = typeof details.bleeding === "string" ? details.bleeding : "";
  const woundType = typeof details.woundType === "string" ? details.woundType : "";
  const deformity = typeof details.deformity === "string" ? details.deformity : "unselected";
  const sutureRequired = typeof details.sutureRequired === "string" ? details.sutureRequired : "unselected";
  const photoTaken = typeof details.photoTaken === "string" ? details.photoTaken : "unselected";
  const confirmed = typeof details.confirmed === "string" ? details.confirmed : "unselected";
  const siteOptions = getTraumaSiteOptions(region || "その他");

  const updateTraumaDetail = (detailId: string, value: FindingDetailValue) => {
    const nextDetails = { ...details, [detailId]: value };
    if (detailId === "region" && typeof value === "string" && value !== region) {
      nextDetails.site = "";
      nextDetails.siteOther = "";
    }
    if (detailId === "site" && value !== "その他") {
      nextDetails.siteOther = "";
    }

    onChangeDetail(sectionId, itemId, detailId, value);
    if (detailId === "region" && typeof value === "string" && value !== region) {
      onChangeDetail(sectionId, itemId, "site", "");
      onChangeDetail(sectionId, itemId, "siteOther", "");
    }
    if (detailId === "site" && value !== "その他") {
      onChangeDetail(sectionId, itemId, "siteOther", "");
    }

    const active = Object.values(nextDetails).some((entry) => hasTraumaValue(entry));
    onChangeItemState(sectionId, itemId, active ? "positive" : "unselected");
  };

  const traumaNumber = getTraumaItemNumber(itemId);

  return (
    <div className="px-1 py-1.5">
      <div className="flex items-center gap-2">
        <p className="text-[11px] font-bold leading-none text-slate-700">{label ?? `外傷${traumaNumber ?? ""}`}</p>
        <div className="h-px flex-1 bg-slate-300" />
      </div>
      <div className="mt-1.5 flex flex-wrap items-end gap-x-2 gap-y-1">
        <div className="w-[5.5rem] shrink-0 text-[10px] font-semibold leading-none text-slate-500">大部位</div>
        <div className="w-[8rem] shrink-0 text-[10px] font-semibold leading-none text-slate-500">部位</div>
        {site === "その他" ? <div className="w-[6.5rem] shrink-0 text-[10px] font-semibold leading-none text-slate-500">部位補足</div> : null}
        <div className="w-[5.5rem] shrink-0 text-[10px] font-semibold leading-none text-slate-500">サイズ</div>
        <div className="w-[7.5rem] shrink-0 text-[10px] font-semibold leading-none text-slate-500">出血等</div>
        <div className="w-[6rem] shrink-0 text-[10px] font-semibold leading-none text-slate-500">創傷種別</div>
        <div className="w-[4.75rem] shrink-0 text-[10px] font-semibold leading-none text-slate-500">変形</div>
        <div className="w-[6rem] shrink-0 text-[10px] font-semibold leading-none text-slate-500">縫合</div>
        <div className="w-[5.25rem] shrink-0 text-[10px] font-semibold leading-none text-slate-500">写真</div>
        <div className="w-[4.75rem] shrink-0 text-[10px] font-semibold leading-none text-slate-500">確認</div>
      </div>
      <div className="mt-1 flex flex-wrap items-start gap-2">
        <div className="w-[5.5rem] shrink-0">
          <select
            value={region}
            onChange={(e) => updateTraumaDetail("region", e.target.value)}
            className="h-8 w-full rounded-md border border-slate-200 px-2 text-[12px]"
            aria-label={`${label} 大部位`}
          >
            <option value="">{SELECT_PLACEHOLDER}</option>
            {["頭部", "顔面", "体幹部", "上肢", "下肢", "その他"].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="w-[8rem] shrink-0">
          <select
            value={site}
            onChange={(e) => updateTraumaDetail("site", e.target.value)}
            className="h-8 w-full rounded-md border border-slate-200 px-2 text-[12px]"
            aria-label={`${label} 部位`}
          >
            <option value="">{SELECT_PLACEHOLDER}</option>
            {siteOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        {site === "その他" ? (
          <div className="w-[6.5rem] shrink-0">
            <input
              value={siteOther}
              onChange={(e) => updateTraumaDetail("siteOther", e.target.value)}
              placeholder="その他"
              className="h-8 w-full rounded-md border border-slate-200 px-2 text-[12px]"
              aria-label={`${label} 部位その他`}
            />
          </div>
        ) : null}
        <div className="w-[5.5rem] shrink-0">
          <input
            value={size}
            onChange={(e) => updateTraumaDetail("size", e.target.value)}
            placeholder="サイズ"
            className="h-8 w-full rounded-md border border-slate-200 px-2 text-[12px]"
            aria-label={`${label} サイズ`}
          />
        </div>
        <div className="w-[7.5rem] shrink-0">
          <select
            value={bleeding}
            onChange={(e) => updateTraumaDetail("bleeding", e.target.value)}
            className="h-8 w-full rounded-md border border-slate-200 px-2 text-[12px]"
            aria-label={`${label} 出血等`}
          >
            <option value="">{SELECT_PLACEHOLDER}</option>
            {["出血なし", "少量出血", "中等量出血", "大量出血", "持続出血", "間欠的出血", "拍動性出血", "静脈性出血", "毛細血管性出血", "血腫あり", "血腫拡大あり", "再出血あり"].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="w-[6rem] shrink-0">
          <select
            value={woundType}
            onChange={(e) => updateTraumaDetail("woundType", e.target.value)}
            className="h-8 w-full rounded-md border border-slate-200 px-2 text-[12px]"
            aria-label={`${label} 創傷種別`}
          >
            <option value="">{SELECT_PLACEHOLDER}</option>
            {["切創", "裂創", "刺創", "挫創", "擦過創", "咬創", "剥皮創", "熱傷"].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="w-[4.75rem] shrink-0">
          <TraumaBinaryButtonGroup value={deformity} onChange={(value) => updateTraumaDetail("deformity", value)} />
        </div>
        <div className="w-[6rem] shrink-0">
          <TraumaBinaryButtonGroup value={sutureRequired} onChange={(value) => updateTraumaDetail("sutureRequired", value)} options={TRAUMA_SUTURE_BUTTON_STATES} />
        </div>
        <div className="w-[5.25rem] shrink-0">
          <button
            type="button"
            onClick={() => updateTraumaDetail("photoTaken", photoTaken === "positive" ? "unselected" : "positive")}
            className={`inline-flex h-8 w-full items-center justify-center gap-1 rounded-md border px-2 text-[11px] font-semibold ${photoTaken === "positive" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
          >
            <CameraIcon className="h-3.5 w-3.5" />
            撮影
          </button>
        </div>
        <div className="w-[4.75rem] shrink-0">
          <button
            type="button"
            onClick={() => updateTraumaDetail("confirmed", confirmed === "positive" ? "unselected" : "positive")}
            className={`inline-flex h-8 w-full items-center justify-center gap-1 rounded-md border px-2 text-[11px] font-semibold ${confirmed === "positive" ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
          >
            <CheckCircleIcon className="h-3.5 w-3.5" />
            確認
          </button>
        </div>
      </div>
    </div>
  );
}

function GenericItem({
  section,
  itemDef,
  item,
  onChangeItemState,
  onChangeDetail,
}: {
  section: CaseFindingSectionDefinition;
  itemDef: CaseFindingSectionDefinition["items"][number];
  item: CaseFindings[string][string] | undefined;
  onChangeItemState: (sectionId: string, itemId: string, state: FindingState) => void;
  onChangeDetail: (sectionId: string, itemId: string, detailId: string, value: FindingDetailValue) => void;
}) {
  const itemState = item?.state ?? "unselected";
  const details = item?.details ?? {};
  const hasDetailPanel = itemDef.details.length > 0;
  const isChanged = itemState !== "unselected";
  const useFourColumnLayout = shouldUseFourColumnLayout(itemDef);
  const [isExpanded, setIsExpanded] = useState(itemState === "positive");

  const syncItemStateFromDetails = (nextDetails: Record<string, FindingDetailValue>) => {
    const active = Object.values(nextDetails).some((entry) => hasTraumaValue(entry));
    onChangeItemState(section.id, itemDef.id, active ? "positive" : "unselected");
    if (active) setIsExpanded(true);
  };

  const updateDetailValue = (detailId: string, value: FindingDetailValue) => {
    const nextDetails = { ...details, [detailId]: value };
    onChangeDetail(section.id, itemDef.id, detailId, value);
    if (hasDetailPanel) syncItemStateFromDetails(nextDetails);
  };

  const renderDetailInput = (detailDef: CaseFindingDetailDefinition) => {
    const rawValue = details[detailDef.id];

    if (detailDef.kind === "state") {
      const value = typeof rawValue === "string" ? rawValue : "unselected";
      return (
        <div key={detailDef.id} className="rounded-xl bg-white p-2.5 ring-1 ring-slate-200/80">
          {renderInputLabel(detailDef)}
          <div className="mt-1.5 flex flex-wrap gap-2">
            {STATE_OPTIONS.map((option) => {
              const active = value === option.value;
              return (
                <button
                  key={`${detailDef.id}:${option.value}`}
                  type="button"
                  onClick={() => updateDetailValue(detailDef.id, active ? "unselected" : option.value)}
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
        <label key={detailDef.id} className="rounded-xl bg-white p-2.5 ring-1 ring-slate-200/80">
          {renderInputLabel(detailDef)}
          <select
            value={value}
            onChange={(e) => updateDetailValue(detailDef.id, e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"
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
        <div key={detailDef.id} className="rounded-xl bg-white p-2.5 ring-1 ring-slate-200/80">
          {renderInputLabel(detailDef)}
          <div className="mt-1.5 flex flex-wrap gap-2">
            {(detailDef.options ?? []).map((option) => {
              const active = values.includes(option);
              return (
                <button
                  key={`${detailDef.id}:${option}`}
                  type="button"
                  onClick={() => updateDetailValue(detailDef.id, toggleOption(values, option))}
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
    const value = detailDef.kind === "duration" ? normalizeDurationInput(baseValue) : baseValue;
    return (
      <label key={detailDef.id} className="rounded-xl bg-white p-2.5 ring-1 ring-slate-200/80">
        {renderInputLabel(detailDef)}
        <input
          type="text"
          inputMode={detailDef.kind === "number" || detailDef.kind === "duration" || detailDef.kind === "time" ? "numeric" : undefined}
          placeholder={detailDef.kind === "duration" ? "MM:SS" : detailDef.kind === "time" ? "HH:MM" : undefined}
          value={value}
          onChange={(e) => {
            const nextValue = detailDef.kind === "duration" ? normalizeDurationInput(e.target.value) : e.target.value;
            updateDetailValue(detailDef.id, nextValue);
          }}
          className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"
        />
      </label>
    );
  };

  return (
    <div className={`rounded-[20px] p-3 transition ${isChanged ? "bg-emerald-50/65" : "bg-slate-50/85"}`}>
      {hasDetailPanel ? (
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex w-full flex-wrap items-center justify-between gap-2 rounded-md text-left transition hover:text-slate-900"
          aria-label={`${itemDef.label}を展開`}
          aria-expanded={isExpanded}
        >
          <div>
            <p className={`text-[13px] font-semibold ${isChanged ? "text-emerald-800" : "text-slate-800"}`}>{itemDef.label}</p>
          </div>
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white text-slate-500 transition hover:text-slate-700">
            <ChevronRightIcon className={`h-3.5 w-3.5 transition ${isExpanded ? "rotate-90" : ""}`} />
          </span>
        </button>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
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
      )}

      {(hasDetailPanel ? isExpanded : itemState === "positive") && itemDef.details.length > 0 ? (
        <div className={`mt-2.5 grid gap-2.5 ${useFourColumnLayout ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-4" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"}`}>
          {itemDef.details
            .filter((detailDef) => {
              if (!item) return false;
              const visibilityItem = { ...item, state: "positive" as FindingState, details };
              return isFindingDetailVisible(itemDef.id, detailDef, visibilityItem);
            })
            .map(renderDetailInput)}
        </div>
      ) : null}
    </div>
  );
}

export function CaseFindingsV2Panel({
  sections,
  findings,
  onChangeItemState,
  onChangeDetail,
}: CaseFindingsV2PanelProps) {
  return (
    <section className="rounded-[26px] bg-white px-5 py-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.22)]">
      <div className="mb-4">
        <p className="text-[10px] font-semibold tracking-[0.18em] text-slate-400">FINDINGS</p>
        <h2 className="mt-1 text-base font-bold tracking-tight text-slate-900">所見</h2>
      </div>
      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.id} className="rounded-[22px] bg-slate-50/75 p-3.5">
            <h3 className="text-[12px] font-semibold text-slate-900">{section.label}</h3>
            <div className="mt-2.5 space-y-2.5">
              {section.items.map((itemDef) => {
                const item = findings[section.id]?.[itemDef.id];

                if (section.id === "musculoskeletal" && isTraumaItemId(itemDef.id)) {
                  return (
                    <TraumaRow
                      key={`${section.id}:${itemDef.id}`}
                      sectionId={section.id}
                      itemId={itemDef.id}
                      label={itemDef.label}
                      details={item?.details ?? {}}
                      onChangeItemState={onChangeItemState}
                      onChangeDetail={onChangeDetail}
                    />
                  );
                }

                return (
                  <GenericItem
                    key={`${section.id}:${itemDef.id}`}
                    section={section}
                    itemDef={itemDef}
                    item={item}
                    onChangeItemState={onChangeItemState}
                    onChangeDetail={onChangeDetail}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
