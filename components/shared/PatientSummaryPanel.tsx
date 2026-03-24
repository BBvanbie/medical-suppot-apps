"use client";

import { ChevronRightIcon } from "@heroicons/react/20/solid";
import { CameraIcon } from "@heroicons/react/24/outline";
import { useMemo } from "react";

import { parseChangedFindingDetail } from "@/lib/caseFindingsSummary";
import { formatCaseGenderLabel } from "@/lib/casePresentation";

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
    bleeding: getFieldValue(item.fields, "出血"),
    deformity: getFieldValue(item.fields, "変形有無"),
    sutureRequired: getFieldValue(item.fields, "縫合要否"),
  };
}


export function PatientSummaryPanel({ summary, caseId, className }: PatientSummaryPanelProps) {
  const normalizedSummary = summary ?? {};
  const relatedPeople = useMemo(
    () =>
      withFixedLength(
        asArray(normalizedSummary.relatedPeople).map((item) => ({
          name: item.name,
          relation: item.relation,
          phone: item.phone,
        })),
        3,
        () => ({ name: "", relation: "", phone: "" }),
      ),
    [normalizedSummary.relatedPeople],
  );
  const pastHistories = useMemo(
    () =>
      withFixedLength(
        asArray(normalizedSummary.pastHistories).map((item) => ({
          disease: item.disease,
          clinic: item.clinic,
        })),
        6,
        () => ({ disease: "", clinic: "" }),
      ),
    [normalizedSummary.pastHistories],
  );
  const vitals = asArray(normalizedSummary.vitals);
  const latestVital = vitals[vitals.length - 1] ?? null;
  const changedFindings = asArray(normalizedSummary.changedFindings);
  const findingCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of changedFindings) {
      const major = asText(item.major);
      counts.set(major, (counts.get(major) ?? 0) + 1);
    }
    return [...counts.entries()].map(([major, count]) => ({ major, count }));
  }, [changedFindings]);
  const groupedChangedFindings = useMemo(() => {
    const grouped = new Map<string, ChangedFindingItemView[]>();

    for (const item of changedFindings) {
      const major = asText(item.major);
      const middle = asText(item.middle);
      const parsed = parseChangedDetail(asText(item.detail));
      const current = grouped.get(major) ?? [];
      current.push({ middle, status: parsed.status, fields: parsed.fields });
      grouped.set(major, current);
    }

    return [...grouped.entries()].map(([major, items]) => ({ major, items }));
  }, [changedFindings]);

  return (
    <div className={className ?? "space-y-4"}>
      <div className="rounded-xl border border-slate-300 bg-sky-50/55 p-4">
        <p className="rounded-md bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-800">基本情報</p>
        <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-12">
          <div className="md:col-span-2"><span className="text-xs text-slate-500">事案ID</span><p className="font-semibold text-slate-800">{asText(caseId ?? normalizedSummary.caseId)}</p></div>
          <div className="md:col-span-3"><span className="text-xs text-slate-500">氏名</span><p className="font-semibold text-slate-800">{asText(normalizedSummary.name)}</p></div>
          <div className="md:col-span-2"><span className="text-xs text-slate-500">性別</span><p className="font-semibold text-slate-800">{formatCaseGenderLabel(normalizedSummary.gender as string | null | undefined)}</p></div>
          <div className="md:col-span-3"><span className="text-xs text-slate-500">生年月日</span><p className="font-semibold text-slate-800">{asText(normalizedSummary.birthSummary)}</p></div>
          <div className="md:col-span-2"><span className="text-xs text-slate-500">年齢</span><p className="font-semibold text-slate-800">{asText(normalizedSummary.age)}</p></div>
          <div className="md:col-span-8"><span className="text-xs text-slate-500">住所</span><p className="font-semibold text-slate-800">{asText(normalizedSummary.address)}</p></div>
          <div className="md:col-span-4"><span className="text-xs text-slate-500">電話番号</span><p className="font-semibold text-slate-800">{asText(normalizedSummary.phone)}</p></div>
          <div className="md:col-span-3"><span className="text-xs text-slate-500">ADL</span><p className="font-semibold text-slate-800">{asText(normalizedSummary.adl)}</p></div>
          <div className="md:col-span-4"><span className="text-xs text-slate-500">アレルギー</span><p className="font-semibold text-slate-800">{asText(normalizedSummary.allergy)}</p></div>
          <div className="md:col-span-2"><span className="text-xs text-slate-500">DNAR</span><p className="font-semibold text-slate-800">{asText(normalizedSummary.dnar)}</p></div>
          <div className="md:col-span-3"><span className="text-xs text-slate-500">体重(kg)</span><p className="font-semibold text-slate-800">{asText(normalizedSummary.weight)}</p></div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {relatedPeople.map((person: RelatedPerson, idx) => {
            const isEmpty = [person.name, person.relation, person.phone].every((value) => String(value ?? "").trim() === "");
            return (
              <div
                key={`summary-related-${idx}`}
                className={`rounded-lg border p-3 text-xs ${isEmpty ? "border-slate-200 bg-slate-100 text-slate-400" : "border-slate-300 bg-white text-slate-700"}`}
              >
                <p className="mb-1 text-xs font-semibold">関係者 {idx + 1}</p>
                <div className="grid grid-cols-2 gap-2">
                  <p className="text-xs">氏名: <span className="font-semibold">{String(person.name ?? "").trim() || "-"}</span></p>
                  <p className="text-xs">続柄: <span className="font-semibold">{String(person.relation ?? "").trim() || "-"}</span></p>
                </div>
                <p className="mt-1 text-xs">電話: <span className="font-semibold">{String(person.phone ?? "").trim() || "-"}</span></p>
              </div>
            );
          })}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {pastHistories.map((item: PastHistory, idx) => {
            const isEmpty = [item.disease, item.clinic].every((value) => String(value ?? "").trim() === "");
            return (
              <div
                key={`summary-history-${idx}`}
                className={`rounded-lg border p-3 text-xs ${isEmpty ? "border-slate-200 bg-slate-100 text-slate-400" : "border-slate-300 bg-white text-slate-700"}`}
              >
                <p className="mb-1 text-xs font-semibold">既往歴 {idx + 1}</p>
                <p className="text-xs">疾患: <span className="font-semibold">{String(item.disease ?? "").trim() || "-"}</span></p>
                <p className="mt-1 text-xs">かかりつけ: <span className="font-semibold">{String(item.clinic ?? "").trim() || "-"}</span></p>
              </div>
            );
          })}
        </div>
        <div className="mt-3 rounded-lg border border-slate-300 bg-white p-3 text-xs text-slate-700">
          <p className="font-semibold">特記事項</p>
          <p className="mt-1 whitespace-pre-wrap">{asText(normalizedSummary.specialNote)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-300 bg-emerald-50/45 p-4">
        <p className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">覚知 / 主訴 / バイタル</p>
        <div className="mt-3 grid grid-cols-12 gap-3 text-sm">
          <div className="col-span-12"><span className="text-xs text-slate-500">覚知内容</span><p className="font-semibold text-slate-800">{asText(normalizedSummary.dispatchSummary)}</p></div>
          <div className="col-span-12"><span className="text-xs text-slate-500">主訴</span><p className="font-semibold text-slate-800">{asText(normalizedSummary.chiefComplaint)}</p></div>
          <div className="col-span-12 rounded-lg border border-blue-300 bg-blue-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-blue-700">最新バイタル</p>
              <p className="text-xs font-medium text-blue-700/80">測定: {asText(latestVital?.measuredAt)}</p>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
              <div className="rounded-lg bg-white/80 px-3 py-2">
                <p className="text-[11px] font-medium text-slate-500">意識</p>
                <p className="mt-1 text-base font-bold text-slate-900">{latestVital ? formatConsciousness(latestVital) : "-"}</p>
              </div>
              <div className="rounded-lg bg-white/80 px-3 py-2">
                <p className="text-[11px] font-medium text-slate-500">呼吸数</p>
                <p className="mt-1 text-base font-bold text-slate-900">{latestVital ? formatWithUnit(latestVital.respiratoryRate, "回") : "-"}</p>
              </div>
              <div className="rounded-lg bg-white/80 px-3 py-2">
                <p className="text-[11px] font-medium text-slate-500">脈拍数</p>
                <p className="mt-1 text-base font-bold text-slate-900">{latestVital ? formatWithUnit(latestVital.pulseRate, "回") : "-"}</p>
              </div>
              <div className="rounded-lg bg-white/80 px-3 py-2">
                <p className="text-[11px] font-medium text-slate-500">SpO2</p>
                <p className="mt-1 text-base font-bold text-slate-900">{latestVital ? formatWithUnit(latestVital.spo2, "%") : "-"}</p>
              </div>
              <div className="rounded-lg bg-white/80 px-3 py-2">
                <p className="text-[11px] font-medium text-slate-500">瞳孔</p>
                <p className="mt-1 text-base font-bold text-slate-900">{latestVital ? formatPupilBoth(latestVital) : "-"}</p>
              </div>
              <div className="rounded-lg bg-white/80 px-3 py-2">
                <p className="text-[11px] font-medium text-slate-500">体温</p>
                <p className="mt-1 text-base font-bold text-slate-900">{latestVital ? formatTemperature(latestVital) : "-"}</p>
              </div>
              <div className="rounded-lg bg-white/80 px-3 py-2">
                <p className="text-[11px] font-medium text-slate-500">心電図</p>
                <p className="mt-1 break-words text-sm font-semibold text-slate-900">{latestVital ? asText(latestVital.ecg) : "-"}</p>
              </div>
            </div>
          </div>
          <div className="col-span-12">
            <p className="text-sm font-semibold text-slate-600">バイタル履歴</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {vitals.length > 0 ? (
                vitals.map((vital, idx) => (
                  <div key={`summary-vital-${idx}`} className="rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-700">
                    <p className="font-semibold">{idx + 1}回目 ({asText(vital.measuredAt)})</p>
                    <p>意識: {formatConsciousness(vital)}</p>
                    <p>呼吸数: {formatWithUnit(vital.respiratoryRate, "回")} / 脈拍数: {formatWithUnit(vital.pulseRate, "回")} / 心電図: {asText(vital.ecg)}</p>
                    <p>SpO2: {formatWithUnit(vital.spo2, "%")}</p>
                    <p>瞳孔: {formatPupilBoth(vital)} / 体温: {formatTemperature(vital)}</p>
                  </div>
                ))
              ) : (
                <div className="col-span-3 rounded-lg border border-slate-200 bg-slate-100 p-3 text-sm text-slate-400">バイタル記録なし</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-300 bg-amber-50/45 p-4">
        <p className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">状態変化サマリー</p>
        <div className="mt-3 space-y-2">
          {findingCounts.length > 0 ? (
            findingCounts.map((item) => (
              <div key={`summary-major-${item.major}`} className={`rounded-lg border p-2 text-xs ${item.count > 0 ? "border-amber-300 bg-amber-50 text-amber-800" : "border-slate-300 bg-white text-slate-500"}`}>
                <p className="font-semibold">{item.major}</p>
                <p>{item.count > 0 ? `${item.count}件` : "変化なし"}</p>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-500">変化なし</div>
          )}
        </div>
        <div className="mt-3">
          <p className="text-xs font-semibold text-slate-500">状態変化詳細</p>
          <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-slate-300 bg-slate-50/40 p-3">
            {groupedChangedFindings.length > 0 ? (
              <div className="space-y-3">
                {groupedChangedFindings.map((group) => (
                  <section key={`changed-finding-group-${group.major}`} className="rounded-xl border border-[#E6EAF0] bg-white p-4">
                    <h4 className="mb-3 text-[15px] font-bold text-[#2F3A4A]">{group.major}</h4>
                    {group.items.some((item) => isTraumaMiddleLabel(item.middle)) ? (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {group.items
                          .filter((item) => isTraumaMiddleLabel(item.middle))
                          .map((item) => {
                            const trauma = buildTraumaSummaryCard(item);
                            return (
                              <article key={`trauma-card-${item.middle}`} className="rounded-2xl bg-slate-50 p-3">
                                <p className="text-sm font-bold text-slate-900">{trauma.title}</p>
                                <div className="mt-2 flex aspect-[4/3] min-h-[140px] items-center justify-center rounded-xl bg-slate-200/70 text-slate-500">
                                  <div className="flex flex-col items-center gap-2 text-xs font-medium">
                                    <CameraIcon className="h-8 w-8" />
                                    <span>写真未登録</span>
                                  </div>
                                </div>
                                <p className="mt-3 text-sm font-semibold text-slate-800">
                                  {trauma.site} / {trauma.woundType} / {trauma.size}
                                </p>
                                <p className="mt-2 text-[13px] text-slate-600">出血: <span className="font-semibold text-slate-800">{trauma.bleeding}</span></p>
                                <p className="mt-1 text-[13px] text-slate-600">変形有無: <span className="font-semibold text-slate-800">{trauma.deformity}</span></p>
                                <div className="mt-2">
                                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getSutureTone(trauma.sutureRequired)}`}>
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
                          <div key={`changed-finding-item-${group.major}-${item.middle}`} className="flex flex-wrap items-start gap-x-4 gap-y-1 text-[13px] leading-[1.65] text-[#475467]">
                            <div className="flex min-w-[120px] items-center gap-1.5 text-[14px] font-bold text-[#344054]">
                              <ChevronRightIcon className="h-3.5 w-3.5 text-amber-500" />
                              <span>{item.middle}</span>
                            </div>
                            <div className="min-w-[64px]">
                              {item.status ? (
                                <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold ${getStatusTone(item.status)}`}>
                                  {item.status}
                                </span>
                              ) : null}
                            </div>
                            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1.5">
                              {item.fields.map((field, fieldIdx) => (
                                <div key={`changed-finding-field-${group.major}-${item.middle}-${field.label}-${fieldIdx}`} className="flex min-w-0 items-baseline gap-1.5">
                                  <span className="shrink-0 text-[12px] font-medium text-slate-500">{field.label}:</span>
                                  <span className="min-w-0 break-words text-[13px] text-slate-700">{field.value}</span>
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
      </div>
    </div>
  );
}
