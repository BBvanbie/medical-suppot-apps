"use client";

import { ChevronRightIcon } from "@heroicons/react/20/solid";
import { CameraIcon } from "@heroicons/react/24/outline";
import type { ReactNode } from "react";

import { parseChangedFindingDetail } from "@/lib/caseFindingsSummary";
import { formatCaseGenderLabel } from "@/lib/casePresentation";
import {
  normalizeTriageAssessment,
  START_TRIAGE_TAG_LABELS,
} from "@/lib/triageAssessment";

type SummaryRecord = Record<string, unknown>;

type PatientSummaryPanelProps = {
  summary: SummaryRecord | null | undefined;
  caseId?: string | null;
  className?: string;
};

type RelatedPerson = {
  name?: unknown;
  relation?: unknown;
  phone?: unknown;
};

type PastHistory = {
  disease?: unknown;
  clinic?: unknown;
};

type ChangedFindingField = {
  label: string;
  value: string;
};

type ChangedFindingItemView = {
  middle: string;
  status: string | null;
  fields: ChangedFindingField[];
};

type TraumaSummaryCard = {
  title: string;
  site: string;
  woundType: string;
  size: string;
  bleeding: string;
  deformity: string;
  sutureRequired: string;
};

function asText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function asArray(value: unknown): SummaryRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is SummaryRecord => Boolean(item && typeof item === "object" && !Array.isArray(item)),
  );
}

function withFixedLength<T>(items: T[], minLength: number, factory: () => T): T[] {
  const next = [...items];
  while (next.length < minLength) next.push(factory());
  return next;
}

function formatWithUnit(value: unknown, unit: string): string {
  const normalized = asText(value);
  return normalized === "-" ? normalized : `${normalized}${unit}`;
}

function formatConsciousness(vital: SummaryRecord): string {
  const type = String(vital.consciousnessType ?? "").toLowerCase() === "gcs" ? "GCS" : "JCS";
  const value = String(vital.consciousnessValue ?? "").trim();
  return `${type} ${value || "-"}`;
}

function formatPupilSide(size: unknown, reflex: unknown): string {
  const normalized = asText(size);
  if (normalized === "-") return normalized;
  return `${normalized}${String(reflex ?? "") === "なし" ? "-" : "+"}`;
}

function formatPupilBoth(vital: SummaryRecord): string {
  const right = formatPupilSide(vital.pupilRight, vital.lightReflexRight);
  const left = formatPupilSide(vital.pupilLeft, vital.lightReflexLeft);
  if (right === "-" && left === "-") return "-";
  return `${right}/${left}`;
}

function formatTemperature(vital: SummaryRecord): string {
  return vital.temperatureUnavailable ? "測定不可" : asText(vital.temperature);
}

function isNextSegmentStart(text: string, index: number): boolean {
  let cursor = index;
  while (cursor < text.length && text[cursor] === " ") cursor += 1;
  if (cursor >= text.length) return false;

  let probe = cursor;
  while (probe < text.length) {
    const char = text[probe];
    if (char === ":") return probe > cursor;
    if (char === "(") return probe > cursor;
    if (char === " " || char === ")") return false;
    probe += 1;
  }

  return false;
}

function splitTopLevelSegments(detail: string): string[] {
  const segments: string[] = [];
  let depth = 0;
  let buffer = "";

  for (let index = 0; index < detail.length; index += 1) {
    const char = detail[index];

    if (char === "(") depth += 1;
    if (char === ")" && depth > 0) depth -= 1;

    if (char === " " && depth === 0 && isNextSegmentStart(detail, index + 1)) {
      const normalized = buffer.trim();
      if (normalized) segments.push(normalized);
      buffer = "";
      continue;
    }

    buffer += char;
  }

  const tail = buffer.trim();
  if (tail) segments.push(tail);
  return segments;
}

function normalizeStateValue(value: string): { label: string; detail: string | null } | null {
  const normalized = value.trim();
  if (!normalized) return null;

  const detailed = normalized.match(/^([+\-\uff0b\uff0d])(\((.*)\))?$/);
  if (detailed) {
    return {
      label: detailed[1] === "-" || detailed[1] === "\uff0d" ? "\uff0d" : "\uff0b",
      detail: detailed[3]?.trim() || null,
    };
  }

  if (normalized === "\u78ba\u8a8d\u56f0\u96e3") {
    return { label: "\u78ba\u8a8d\u56f0\u96e3", detail: null };
  }

  return null;
}

function normalizeFieldValue(value: string): string {
  const normalized = value.trim();
  if (!normalized || normalized === "-") return "\u8a18\u8f09\u306a\u3057";

  const state = normalizeStateValue(normalized);
  if (state) {
    return state.detail ? `${state.label}\uff08${state.detail}\uff09` : state.label;
  }

  return normalized;
}

function normalizeStatusValue(value: string): string {
  const state = normalizeStateValue(value);
  return state ? state.label : normalizeFieldValue(value);
}

function isStatusLabel(label: string): boolean {
  return label === "\u72b6\u614b" || label === "+/-" || label === "\u6709\u7121";
}

function getStatusTone(status: string): string {
  if (status === "\uff0b") return "bg-rose-50 text-rose-700";
  if (status === "\uff0d") return "bg-sky-50 text-sky-700";
  return "bg-slate-100 text-slate-700";
}

function getSutureTone(value: string): string {
  if (value === "\uff0b") return "bg-rose-50 text-rose-700";
  if (value === "\uff0d") return "bg-sky-50 text-sky-700";
  return "bg-slate-100 text-slate-700";
}

function formatNestedFindingField(label: string, nested: string): ChangedFindingField {
  const value = splitTopLevelSegments(nested)
    .map((segment) => {
      const match = segment.match(/^(.+?):\s*(.+)$/);
      if (!match) return normalizeFieldValue(segment.trim());
      return `${match[1].trim()} ${normalizeFieldValue(match[2])}`;
    })
    .join(" / ");

  return { label, value: value || "\u8a18\u8f09\u306a\u3057" };
}

function parseChangedDetail(detail: string): { status: string | null; fields: ChangedFindingField[] } {
  const structured = parseChangedFindingDetail(detail);
  if (structured) {
    return {
      status: structured.status ? normalizeStatusValue(structured.status) : null,
      fields: structured.fields.map((field) => ({
        label: field.label,
        value: normalizeFieldValue(field.value),
      })),
    };
  }

  let status: string | null = null;
  const fields: ChangedFindingField[] = [];

  for (const segment of splitTopLevelSegments(detail)) {
    const nestedMatch = segment.match(/^([^:(]+)\((.*)\)$/);
    if (nestedMatch) {
      fields.push(formatNestedFindingField(nestedMatch[1].trim(), nestedMatch[2].trim()));
      continue;
    }

    const labeledMatch = segment.match(/^(.+?):\s*(.+)$/);
    if (!labeledMatch) {
      fields.push({ label: "\u8a73\u7d30", value: normalizeFieldValue(segment) });
      continue;
    }

    const label = labeledMatch[1].trim();
    const value = labeledMatch[2].trim();
    if (isStatusLabel(label)) {
      status = normalizeStatusValue(value);
      continue;
    }

    fields.push({ label, value: normalizeFieldValue(value) });
  }

  return { status, fields };
}

function isTraumaMiddleLabel(value: string): boolean {
  return /^外傷\d+$/.test(value);
}

function getFieldValue(fields: ChangedFindingField[], label: string): string {
  return fields.find((field) => field.label === label)?.value ?? "\u8a18\u8f09\u306a\u3057";
}

function buildTraumaSummaryCard(item: ChangedFindingItemView): TraumaSummaryCard {
  const region = getFieldValue(item.fields, "大部位");
  const site = getFieldValue(item.fields, "部位");
  const siteOther = getFieldValue(item.fields, "部位(その他)");
  return {
    title: item.middle,
    site: [region, site === "その他" ? siteOther : site]
      .filter((value) => value !== "\u8a18\u8f09\u306a\u3057")
      .join(" / ") || "\u8a18\u8f09\u306a\u3057",
    woundType: getFieldValue(item.fields, "創傷種別"),
    size: getFieldValue(item.fields, "サイズ"),
    bleeding: getFieldValue(item.fields, "出血等") !== "記載なし" ? getFieldValue(item.fields, "出血等") : getFieldValue(item.fields, "出血"),
    deformity: getFieldValue(item.fields, "変形有無"),
    sutureRequired: getFieldValue(item.fields, "縫合要否"),
  };
}

function SummaryMetaRail({
  items,
}: {
  items: Array<{ label: string; value: string; span?: string }>;
}) {
  return (
    <div className="grid gap-x-5 gap-y-3 border-b border-slate-200/70 pb-4 md:grid-cols-12">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className={item.span ?? "md:col-span-3"}>
          <p className="ds-text-2xs font-semibold ds-track-eyebrow text-slate-400">{item.label}</p>
          <p className="mt-1 ds-text-sm-compact font-semibold leading-5 text-slate-900">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function SummaryPeopleRow({ items }: { items: RelatedPerson[] }) {
  return (
    <div className="grid gap-2 md:grid-cols-3">
      {items.map((person, idx) => {
        const isEmpty = [person.name, person.relation, person.phone].every((value) => String(value ?? "").trim() === "");
        return (
          <div
            key={`summary-related-${idx}`}
            className={`ds-muted-panel rounded-2xl px-3 py-3 ${isEmpty ? "text-slate-400" : "text-slate-700"}`}
          >
            <p className="ds-text-xs-compact font-semibold ds-track-label text-slate-400">関係者 {idx + 1}</p>
            <p className="mt-2 ds-text-sm-compact font-semibold text-slate-900">{String(person.name ?? "").trim() || "-"}</p>
            <p className="mt-1 ds-text-xs-compact leading-5">{String(person.relation ?? "").trim() || "-"}</p>
            <p className="mt-1 ds-text-xs-compact leading-5">{String(person.phone ?? "").trim() || "-"}</p>
          </div>
        );
      })}
    </div>
  );
}

function SummaryPastHistoryGrid({ items }: { items: PastHistory[] }) {
  return (
    <div className="grid gap-2 md:grid-cols-3">
      {items.map((item, idx) => {
        const isEmpty = [item.disease, item.clinic].every((value) => String(value ?? "").trim() === "");
        return (
          <div
            key={`summary-history-${idx}`}
            className={`ds-muted-panel rounded-2xl px-3 py-3 ${isEmpty ? "text-slate-400" : "text-slate-700"}`}
          >
            <p className="ds-text-xs-compact font-semibold ds-track-label text-slate-400">既往症 {idx + 1}</p>
            <p className="mt-2 ds-text-sm-compact font-semibold text-slate-900">{String(item.disease ?? "").trim() || "-"}</p>
            <p className="mt-1 ds-text-xs-compact leading-5">{String(item.clinic ?? "").trim() || "-"}</p>
          </div>
        );
      })}
    </div>
  );
}

function SummarySection({ kicker, title, children, tone = "plain" }: { kicker: string; title: string; children: ReactNode; tone?: "plain" | "muted" }) {
  return (
    <section className={`mt-5 ds-radius-command px-5 py-5 ${tone === "muted" ? "ds-muted-panel" : "ds-panel-surface shadow-none"}`}>
      <p className="ds-text-2xs font-semibold ds-track-eyebrow-wide text-blue-600">{kicker}</p>
      <h3 className="mt-1 ds-text-lg-compact font-bold ds-track-title text-slate-950">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const startWalkingLabels = { yes: "歩行可", no: "歩行不可", "": "-" } as const;
const startRespirationLabels = {
  normal: "10-29/分相当",
  abnormal: "10未満または30以上",
  absent: "呼吸なし",
  returns_after_airway: "気道確保で呼吸再開",
  "": "-",
} as const;
const startPerfusionLabels = { normal: "橈骨触知/正常", abnormal: "触知不可/異常", "": "-" } as const;
const startMentalLabels = { obeys: "従命可", not_obeys: "従命不可", "": "-" } as const;
const anatomicalPriorityLabels = {
  black: "救命困難所見",
  red: "緊急所見あり",
  yellow: "要観察",
  green: "軽症",
  not_applicable: "該当なし",
  pending: "確認中",
  "": "-",
} as const;


export function PatientSummaryPanel({ summary, caseId, className }: PatientSummaryPanelProps) {
  const normalizedSummary = summary ?? {};
  const triageAssessment = normalizeTriageAssessment(normalizedSummary.triageAssessment);
  const hasTriageAssessment = Boolean(
    triageAssessment.start.walking ||
      triageAssessment.start.respiration ||
      triageAssessment.start.perfusion ||
      triageAssessment.start.mentalStatus ||
      triageAssessment.start.tag ||
      triageAssessment.anatomical.priority ||
      triageAssessment.anatomical.findings.length > 0 ||
      triageAssessment.anatomical.tag ||
      triageAssessment.injuryDetails.trim(),
  );
  const relatedPeople = withFixedLength(
    asArray(normalizedSummary.relatedPeople).map((item) => ({
      name: item.name,
      relation: item.relation,
      phone: item.phone,
    })),
    3,
    () => ({ name: "", relation: "", phone: "" }),
  );
  const pastHistories = withFixedLength(
    asArray(normalizedSummary.pastHistories).map((item) => ({
      disease: item.disease,
      clinic: item.clinic,
    })),
    6,
    () => ({ disease: "", clinic: "" }),
  );
  const vitals = asArray(normalizedSummary.vitals);
  const latestVital = vitals[vitals.length - 1] ?? null;
  const changedFindings = asArray(normalizedSummary.changedFindings);
  const counts = new Map<string, number>();
  for (const item of changedFindings) {
    const major = asText(item.major);
    counts.set(major, (counts.get(major) ?? 0) + 1);
  }
  const findingCounts = [...counts.entries()].map(([major, count]) => ({ major, count }));
  const grouped = new Map<string, ChangedFindingItemView[]>();
  for (const item of changedFindings) {
    const major = asText(item.major);
    const middle = asText(item.middle);
    const parsed = parseChangedDetail(asText(item.detail));
    const current = grouped.get(major) ?? [];
    current.push({ middle, status: parsed.status, fields: parsed.fields });
    grouped.set(major, current);
  }
  const groupedChangedFindings = [...grouped.entries()].map(([major, items]) => ({ major, items }));
  const vitalHistoryCards = withFixedLength<SummaryRecord | null>(vitals.slice(0, 3), 3, () => null);
  const basicFields = [
    { label: "事案ID", value: asText(caseId ?? normalizedSummary.caseId), span: "md:col-span-2" },
    { label: "氏名", value: asText(normalizedSummary.name), span: "md:col-span-3" },
    {
      label: "性別",
      value: formatCaseGenderLabel(normalizedSummary.gender as string | null | undefined),
      span: "md:col-span-2",
    },
    { label: "生年月日", value: asText(normalizedSummary.birthSummary), span: "md:col-span-3" },
    { label: "事案種別", value: asText(normalizedSummary.incidentType), span: "md:col-span-2" },
    { label: "年齢", value: asText(normalizedSummary.age), span: "md:col-span-2" },
    { label: "住所", value: asText(normalizedSummary.address), span: "md:col-span-8" },
    { label: "電話番号", value: asText(normalizedSummary.phone), span: "md:col-span-2" },
    { label: "ADL", value: asText(normalizedSummary.adl), span: "md:col-span-3" },
    { label: "アレルギー", value: asText(normalizedSummary.allergy), span: "md:col-span-4" },
    { label: "DNAR", value: asText(normalizedSummary.dnar), span: "md:col-span-2" },
    { label: "体重(kg)", value: asText(normalizedSummary.weight), span: "md:col-span-3" },
  ];

  return (
    <section
      className={
        className ??
        "ds-panel-surface ds-radius-hero ds-bg-gradient-panel-white px-5 py-5"
      }
    >
      <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-200/70 pb-4">
        <div>
          <p className="ds-text-2xs font-semibold ds-track-hero text-blue-600">PATIENT SUMMARY</p>
          <h2 className="mt-2 ds-text-title font-bold ds-track-display text-slate-950">送信前患者サマリー</h2>
        </div>
        <div className="text-right">
          <p className="ds-text-2xs font-semibold ds-track-eyebrow text-slate-400">PRE-SEND REVIEW</p>
          <p className="mt-1 ds-text-xs-plus text-slate-500">病院検索前の確認用</p>
        </div>
      </div>

      <section className="ds-panel-surface ds-radius-panel px-5 py-5 shadow-none">
        <div className="flex items-end justify-between gap-3 border-b border-slate-200/70 pb-3">
          <div>
            <p className="ds-text-2xs font-semibold ds-track-eyebrow-wide text-slate-400">BASIC INFORMATION</p>
            <h3 className="mt-1 ds-text-xl-compact font-bold ds-track-title text-slate-950">基本情報</h3>
          </div>
        </div>

        <div className="mt-4">
          <SummaryMetaRail items={basicFields} />
        </div>

        <div className="mt-4">
          <p className="ds-text-2xs font-semibold ds-track-eyebrow text-slate-400">CONTACTS</p>
          <div className="mt-2">
            <SummaryPeopleRow items={relatedPeople} />
          </div>
        </div>

        <div className="mt-4">
          <p className="ds-text-2xs font-semibold ds-track-eyebrow text-slate-400">MEDICAL HISTORY</p>
          <div className="mt-2">
            <SummaryPastHistoryGrid items={pastHistories} />
          </div>
        </div>
      </section>

      <SummarySection kicker="CHIEF COMPLAINT" title="主訴">
        <p className="whitespace-pre-wrap ds-text-xl-compact font-bold leading-8 ds-track-title text-slate-950">
          {asText(normalizedSummary.chiefComplaint)}
        </p>
      </SummarySection>

      <SummarySection kicker="DISPATCH NOTE" title="要請内容" tone="muted">
        <p className="whitespace-pre-wrap ds-text-sm-compact leading-7 text-slate-700">
          {asText(normalizedSummary.dispatchSummary)}
        </p>
      </SummarySection>

      {hasTriageAssessment ? (
        <SummarySection kicker="TRIAGE ASSESSMENT" title="START法・PAT法 自動判定">
          <div className="grid gap-3 lg:ds-grid-balance">
            <div className="ds-radius-callout border border-rose-200 bg-rose-50/60 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-rose-700">START判定</p>
                <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-rose-700 ring-1 ring-rose-200">
                  {triageAssessment.start.tag ? START_TRIAGE_TAG_LABELS[triageAssessment.start.tag] : "-"}
                </span>
              </div>
              <div className="mt-3 grid gap-2 ds-text-xs-plus text-slate-700">
                <p><span className="font-semibold text-slate-500">歩行:</span> {startWalkingLabels[triageAssessment.start.walking]}</p>
                <p><span className="font-semibold text-slate-500">呼吸:</span> {startRespirationLabels[triageAssessment.start.respiration]}</p>
                <p><span className="font-semibold text-slate-500">循環:</span> {startPerfusionLabels[triageAssessment.start.perfusion]}</p>
                <p><span className="font-semibold text-slate-500">意識:</span> {startMentalLabels[triageAssessment.start.mentalStatus]}</p>
              </div>
            </div>
            <div className="ds-radius-callout border border-slate-200 bg-white px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-slate-500">PAT判定</p>
                <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
                  {triageAssessment.anatomical.tag ? START_TRIAGE_TAG_LABELS[triageAssessment.anatomical.tag] : anatomicalPriorityLabels[triageAssessment.anatomical.priority]}
                </span>
              </div>
              <p className="mt-3 ds-text-xs-plus leading-6 text-slate-700">
                {triageAssessment.anatomical.findings.length > 0 ? triageAssessment.anatomical.findings.join(" / ") : "該当所見なし"}
              </p>
            </div>
          </div>
          <div className="mt-3 ds-radius-callout border border-slate-200 bg-slate-50/80 px-4 py-4">
            <p className="text-xs font-semibold text-slate-500">傷病詳細</p>
            <p className="mt-2 whitespace-pre-wrap ds-text-sm-compact leading-7 text-slate-800">{triageAssessment.injuryDetails.trim() || "-"}</p>
          </div>
        </SummarySection>
      ) : null}

      <SummarySection kicker="LATEST VITAL" title="最新バイタル">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="ds-text-lg-compact font-bold ds-track-title text-slate-950">
            {latestVital ? `${asText(latestVital.measuredAt)} 測定` : "バイタル記録なし"}
          </p>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-7">
          <div className="ds-muted-panel rounded-2xl px-3 py-3 md:col-span-1">
            <p className="ds-text-xs-compact font-medium text-slate-500">意識</p>
            <p className="mt-1 ds-text-md font-bold text-slate-900">{latestVital ? formatConsciousness(latestVital) : "-"}</p>
          </div>
          <div className="ds-muted-panel rounded-2xl px-3 py-3 md:col-span-1">
            <p className="ds-text-xs-compact font-medium text-slate-500">呼吸数</p>
            <p className="mt-1 ds-text-md font-bold text-slate-900">{latestVital ? formatWithUnit(latestVital.respiratoryRate, "回") : "-"}</p>
          </div>
          <div className="ds-muted-panel rounded-2xl px-3 py-3 md:col-span-1">
            <p className="ds-text-xs-compact font-medium text-slate-500">脈拍数</p>
            <p className="mt-1 ds-text-md font-bold text-slate-900">{latestVital ? formatWithUnit(latestVital.pulseRate, "回") : "-"}</p>
          </div>
          <div className="ds-muted-panel rounded-2xl px-3 py-3 md:col-span-1">
            <p className="ds-text-xs-compact font-medium text-slate-500">SpO2</p>
            <p className="mt-1 ds-text-md font-bold text-slate-900">{latestVital ? formatWithUnit(latestVital.spo2, "%") : "-"}</p>
          </div>
          <div className="ds-muted-panel rounded-2xl px-3 py-3 md:col-span-1">
            <p className="ds-text-xs-compact font-medium text-slate-500">瞳孔</p>
            <p className="mt-1 ds-text-md font-bold text-slate-900">{latestVital ? formatPupilBoth(latestVital) : "-"}</p>
          </div>
          <div className="ds-muted-panel rounded-2xl px-3 py-3 md:col-span-1">
            <p className="ds-text-xs-compact font-medium text-slate-500">体温</p>
            <p className="mt-1 ds-text-md font-bold text-slate-900">{latestVital ? formatTemperature(latestVital) : "-"}</p>
          </div>
          <div className="ds-muted-panel rounded-2xl px-3 py-3 md:col-span-1">
            <p className="ds-text-xs-compact font-medium text-slate-500">心電図</p>
            <p className="mt-1 ds-text-sm-compact font-semibold leading-5 text-slate-900">{latestVital ? asText(latestVital.ecg) : "-"}</p>
          </div>
        </div>
      </SummarySection>

      <section className="mt-5">
        <div className="flex items-end justify-between gap-3 border-b border-slate-200/70 pb-2">
          <div>
            <p className="ds-text-2xs font-semibold ds-track-eyebrow-wide text-slate-400">VITAL HISTORY</p>
            <h3 className="mt-1 ds-text-xl-compact font-bold ds-track-title text-slate-950">バイタル1〜3</h3>
          </div>
          <p className="ds-text-xs-compact text-slate-500">複数回の変化を比較</p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {vitalHistoryCards.map((vital, idx) => {
            const hasVital = Boolean(vital);
            return (
              <div key={`summary-vital-${idx}`} className="ds-muted-panel ds-radius-section px-4 py-4">
                <p className="ds-text-xs-compact font-semibold ds-track-label text-slate-400">バイタル {idx + 1}</p>
                {hasVital ? (
                  <div className="mt-2 space-y-1.5 ds-text-xs-plus leading-5 text-slate-700">
                    <p className="font-semibold text-slate-900">{asText(vital?.measuredAt)}</p>
                    <p>意識: {vital ? formatConsciousness(vital) : "-"}</p>
                    <p>呼吸数: {formatWithUnit(vital?.respiratoryRate, "回")}</p>
                    <p>脈拍数: {formatWithUnit(vital?.pulseRate, "回")}</p>
                    <p>SpO2: {formatWithUnit(vital?.spo2, "%")}</p>
                    <p>瞳孔: {vital ? formatPupilBoth(vital) : "-"}</p>
                    <p>体温: {vital ? formatTemperature(vital) : "-"}</p>
                    <p>心電図: {asText(vital?.ecg)}</p>
                  </div>
                ) : (
                  <p className="mt-2 ds-text-xs-plus leading-5 text-slate-400">記録なし</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-5">
        <div className="flex items-end justify-between gap-3 border-b border-slate-200/70 pb-2">
          <div>
            <p className="ds-text-2xs font-semibold ds-track-eyebrow-wide text-slate-400">STATUS CHANGES</p>
            <h3 className="mt-1 ds-text-lg-compact font-bold ds-track-title text-slate-950">変更所見</h3>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {findingCounts.length > 0 ? (
            findingCounts.map((item) => (
              <div
                key={`summary-major-${item.major}`}
                className={`ds-radius-callout px-4 py-3 text-xs ${item.count > 0 ? "border border-amber-200 bg-amber-50/80 text-amber-800" : "ds-muted-panel text-slate-500"}`}
              >
                <p className="font-semibold">{item.major}</p>
                <p>{item.count > 0 ? `${item.count}件` : "変化なし"}</p>
              </div>
            ))
          ) : (
            <div className="ds-muted-panel ds-radius-callout px-4 py-3 text-xs text-slate-500">変化なし</div>
          )}
        </div>

        <div className="ds-muted-panel mt-4 ds-radius-command px-4 py-4">
          <p className="ds-text-2xs font-semibold ds-track-eyebrow text-slate-400">DETAILS</p>
          <div className="mt-3 max-h-72 overflow-auto">
            {groupedChangedFindings.length > 0 ? (
              <div className="space-y-3">
                {groupedChangedFindings.map((group) => (
                  <section key={`changed-finding-group-${group.major}`} className="ds-panel-surface ds-radius-section px-4 py-4 shadow-none">
                    <h4 className="mb-3 ds-text-md font-bold ds-text-gray-800">{group.major}</h4>
                    {group.items.some((item) => isTraumaMiddleLabel(item.middle)) ? (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {group.items
                          .filter((item) => isTraumaMiddleLabel(item.middle))
                          .map((item) => {
                            const trauma = buildTraumaSummaryCard(item);
                            return (
                              <article key={`trauma-card-${item.middle}`} className="ds-muted-panel ds-radius-callout p-3">
                                <p className="text-sm font-bold text-slate-900">{trauma.title}</p>
                                <div className="mt-2 flex ds-aspect-photo ds-min-h-image-placeholder items-center justify-center rounded-xl bg-slate-200/70 text-slate-500">
                                  <div className="flex flex-col items-center gap-2 text-xs font-medium">
                                    <CameraIcon className="h-8 w-8" />
                                    <span>写真未登録</span>
                                  </div>
                                </div>
                                <p className="mt-3 text-sm font-semibold text-slate-800">
                                  {trauma.site} / {trauma.woundType} / {trauma.size}
                                </p>
                                <p className="mt-2 ds-text-sm-compact text-slate-600">出血等: <span className="font-semibold text-slate-800">{trauma.bleeding}</span></p>
                                <p className="mt-1 ds-text-sm-compact text-slate-600">変形有無: <span className="font-semibold text-slate-800">{trauma.deformity}</span></p>
                                <div className="mt-2">
                                  <span className={`inline-flex rounded-full px-2.5 py-1 ds-text-xs-compact font-semibold ${getSutureTone(trauma.sutureRequired)}`}>
                                    縫合要否 {trauma.sutureRequired}
                                  </span>
                                </div>
                              </article>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {group.items.map((item) => (
                          <div key={`changed-finding-item-${group.major}-${item.middle}`} className="flex flex-wrap items-start gap-x-4 gap-y-1 ds-text-sm-compact ds-leading-finding ds-text-gray-600">
                            <div className="flex ds-min-w-action items-center gap-1.5 ds-text-sm-plus font-bold ds-text-gray-700">
                              <ChevronRightIcon className="h-3.5 w-3.5 text-amber-500" />
                              <span>{item.middle}</span>
                            </div>
                            <div className="ds-min-w-16">
                              {item.status ? (
                                <span className={`inline-flex h-6 items-center rounded-full px-2.5 ds-text-xs-compact font-semibold ${getStatusTone(item.status)}`}>
                                  {item.status}
                                </span>
                              ) : null}
                            </div>
                            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1.5">
                              {item.fields.map((field, fieldIdx) => (
                                <div key={`changed-finding-field-${group.major}-${item.middle}-${field.label}-${fieldIdx}`} className="flex min-w-0 items-baseline gap-1.5">
                                  <span className="shrink-0 ds-text-xs-plus font-medium text-slate-500">{field.label}:</span>
                                  <span className="min-w-0 break-words ds-text-sm-compact text-slate-700">{field.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">該当なし</p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-5 border-t border-slate-200/70 pt-4">
        <div>
          <p className="ds-text-2xs font-semibold ds-track-eyebrow-wide text-slate-400">SPECIAL NOTE</p>
          <h3 className="mt-1 ds-text-lg-compact font-bold ds-track-title text-slate-950">特記事項</h3>
        </div>
        <div className="ds-muted-panel mt-3 ds-radius-section px-4 py-4">
          <p className="whitespace-pre-wrap ds-text-xs-plus leading-7 text-slate-700">{asText(normalizedSummary.specialNote)}</p>
        </div>
      </section>
    </section>
  );
}
