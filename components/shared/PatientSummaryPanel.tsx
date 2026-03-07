"use client";

import { Fragment, useMemo } from "react";

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

function asText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function asArray(value: unknown): SummaryRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is SummaryRecord => Boolean(item && typeof item === "object" && !Array.isArray(item)));
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
  return `${type}_${value || "-"}`;
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
  return vital.temperatureUnavailable ? "測定不能" : asText(vital.temperature);
}

function renderChangedDetail(detail: string) {
  const normalized = detail.replace(/\+\/-:/g, "有無:");
  const parts = normalized.split(/\s+/).filter(Boolean);
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-0.5">
      {parts.map((part, idx) => {
        const withSuffix = part.match(/^(.+?):([+-])\((.*)\)$/);
        if (withSuffix) {
          const symbol = withSuffix[2];
          const colorClass = symbol === "+" ? "font-bold text-rose-600" : "font-bold text-sky-600";
          return (
            <Fragment key={`${part}-${idx}`}>
              {idx > 0 ? <span> / </span> : null}
              <span>
                {withSuffix[1]} : （<span className={colorClass}>{symbol}</span>）({withSuffix[3]})
              </span>
            </Fragment>
          );
        }

        const basic = part.match(/^(.+?):([+-])$/);
        if (basic) {
          const symbol = basic[2];
          const colorClass = symbol === "+" ? "font-bold text-rose-600" : "font-bold text-sky-600";
          return (
            <Fragment key={`${part}-${idx}`}>
              {idx > 0 ? <span> / </span> : null}
              <span>
                {basic[1]} : （<span className={colorClass}>{symbol}</span>）
              </span>
            </Fragment>
          );
        }

        const generic = part.match(/^(.+?):(.+)$/);
        if (generic) {
          return (
            <Fragment key={`${part}-${idx}`}>
              {idx > 0 ? <span> / </span> : null}
              <span>
                {generic[1]} : {generic[2]}
              </span>
            </Fragment>
          );
        }

        return (
          <Fragment key={`${part}-${idx}`}>
            {idx > 0 ? <span> / </span> : null}
            <span>{part}</span>
          </Fragment>
        );
      })}
    </div>
  );
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

  return (
    <div className={className ?? "space-y-4"}>
      <div className="rounded-xl border border-slate-300 bg-sky-50/55 p-4">
        <p className="rounded-md bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-800">患者基本情報（全項目）</p>
        <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-12">
          <div className="md:col-span-2"><span className="text-xs text-slate-500">事案ID</span><p className="font-semibold text-slate-800">{asText(caseId ?? normalizedSummary.caseId)}</p></div>
          <div className="md:col-span-3"><span className="text-xs text-slate-500">氏名</span><p className="font-semibold text-slate-800">{asText(normalizedSummary.name)}</p></div>
          <div className="md:col-span-2"><span className="text-xs text-slate-500">性別</span><p className="font-semibold text-slate-800">{asText(normalizedSummary.gender)}</p></div>
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
                  <p className="text-xs">関係: <span className="font-semibold">{String(person.relation ?? "").trim() || "-"}</span></p>
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
                <p className="mb-1 text-xs font-semibold">既往症 {idx + 1}</p>
                <p className="text-xs">病名: <span className="font-semibold">{String(item.disease ?? "").trim() || "-"}</span></p>
                <p className="mt-1 text-xs">かかりつけ: <span className="font-semibold">{String(item.clinic ?? "").trim() || "-"}</span></p>
              </div>
            );
          })}
        </div>
        <div className="mt-3 rounded-lg border border-slate-300 bg-white p-3 text-xs text-slate-700">
          <p className="font-semibold">特記</p>
          <p className="mt-1 whitespace-pre-wrap">{asText(normalizedSummary.specialNote)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-300 bg-emerald-50/45 p-4">
        <p className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">概要 / 主訴 / 観察バイタル</p>
        <div className="mt-3 grid grid-cols-12 gap-3 text-sm">
          <div className="col-span-12"><span className="text-xs text-slate-500">要請概要</span><p className="font-semibold text-slate-800">{asText(normalizedSummary.dispatchSummary)}</p></div>
          <div className="col-span-12"><span className="text-xs text-slate-500">主訴</span><p className="font-semibold text-slate-800">{asText(normalizedSummary.chiefComplaint)}</p></div>
          <div className="col-span-12 rounded-lg border border-blue-300 bg-blue-50 p-3">
            <p className="text-sm font-semibold text-blue-700">最新バイタル（{asText(latestVital?.measuredAt)})</p>
            <p className="mt-1 text-sm text-slate-700">
              意識: {latestVital ? formatConsciousness(latestVital) : "-"} / 呼吸数: {latestVital ? formatWithUnit(latestVital.respiratoryRate, "回") : "-"} / 脈拍数: {latestVital ? formatWithUnit(latestVital.pulseRate, "回") : "-"} / SpO2: {latestVital ? formatWithUnit(latestVital.spo2, "%") : "-"} / 瞳孔: {latestVital ? formatPupilBoth(latestVital) : "-"} / 体温: {latestVital ? formatTemperature(latestVital) : "-"} / 心電図: {latestVital ? asText(latestVital.ecg) : "-"}
            </p>
          </div>
          <div className="col-span-12">
            <p className="text-sm font-semibold text-slate-600">時系列バイタル</p>
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
                <div className="col-span-3 rounded-lg border border-slate-200 bg-slate-100 p-3 text-sm text-slate-400">バイタル未入力</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-300 bg-amber-50/45 p-4">
        <p className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">変更所見サマリー</p>
        <div className="mt-3 space-y-2">
          {findingCounts.length > 0 ? (
            findingCounts.map((item) => (
              <div key={`summary-major-${item.major}`} className={`rounded-lg border p-2 text-xs ${item.count > 0 ? "border-amber-300 bg-amber-50 text-amber-800" : "border-slate-300 bg-white text-slate-500"}`}>
                <p className="font-semibold">{item.major}</p>
                <p>{item.count > 0 ? `${item.count}件変更` : "変更なし"}</p>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-500">変更なし</div>
          )}
        </div>
        <div className="mt-3">
          <p className="text-xs font-semibold text-slate-500">変更詳細</p>
          <div className="mt-2 max-h-72 space-y-1 overflow-auto rounded-lg border border-slate-300 bg-white p-2 text-xs">
            {changedFindings.length > 0 ? (
              changedFindings.map((item, idx) => (
                <div key={`changed-finding-${idx}`} className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1">
                  <p className="text-xs font-semibold text-slate-800">
                    {asText(item.major)} &gt; {asText(item.middle)}
                  </p>
                  <div className="mt-0.5 text-xs text-slate-600">
                    {renderChangedDetail(asText(item.detail))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-500">変更なし</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
