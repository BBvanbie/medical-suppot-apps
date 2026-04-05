"use client";

import { useState } from "react";

import { MedicalInfoFlipCard } from "@/components/hospitals/MedicalInfoFlipCard";

type DepartmentAvailabilityItem = {
  departmentId: string;
  departmentName: string;
  departmentShortName: string;
  isAvailable: boolean;
  updatedAt: string | null;
};

type HospitalMedicalInfoPageProps = {
  initialItems: DepartmentAvailabilityItem[];
};

const UPDATE_ERROR_MESSAGE = "\u8a3a\u7642\u60c5\u5831\u306e\u66f4\u65b0\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002";
const PAGE_TITLE = "\u8a3a\u7642\u60c5\u5831\u5165\u529b";
const PAGE_DESCRIPTION =
  "\u8a3a\u7642\u79d1\u3054\u3068\u306e\u73fe\u5728\u306e\u53d7\u5165\u53ef\u5426\u3092\u6700\u65b0\u72b6\u614b\u3067\u7ba1\u7406\u3057\u307e\u3059\u3002";
const PAGE_HELP =
  "\u30ab\u30fc\u30c9\u3092\u30af\u30ea\u30c3\u30af\u3059\u308b\u3068\u53d7\u5165\u53ef\u80fd / \u53d7\u5165\u4e0d\u53ef\u306e\u72b6\u614b\u3092\u5207\u308a\u66ff\u3048\u307e\u3059\u3002";
const TOTAL_LABEL = "\u5168\u8a3a\u7642\u79d1";
const AVAILABLE_LABEL = "\u53d7\u5165\u53ef\u80fd";
const UNAVAILABLE_LABEL = "\u53d7\u5165\u4e0d\u53ef";
const UPDATED_LABEL = "\u6700\u7d42\u66f4\u65b0\u6642\u523b";

export function HospitalMedicalInfoPage({ initialItems }: HospitalMedicalInfoPageProps) {
  const [items, setItems] = useState(initialItems);
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pageError, setPageError] = useState("");

  const availableCount = items.filter((item) => item.isAvailable).length;
  const unavailableCount = items.length - availableCount;
  const latestUpdatedAt = items
    .map((item) => item.updatedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;

  const formatSummaryTime = (value: string | null) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  const toggleAvailability = async (departmentId: string) => {
    const current = items.find((item) => item.departmentId === departmentId);
    if (!current || savingIds[departmentId]) return;

    const nextAvailability = !current.isAvailable;
    setPageError("");
    setErrors((prev) => ({ ...prev, [departmentId]: "" }));
    setSavingIds((prev) => ({ ...prev, [departmentId]: true }));
    setItems((prev) =>
      prev.map((item) =>
        item.departmentId === departmentId ? { ...item, isAvailable: nextAvailability } : item,
      ),
    );

    try {
      const res = await fetch(`/api/hospitals/medical-info/${departmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: nextAvailability }),
      });
      const data = (await res.json().catch(() => null)) as
        | { message?: string; updatedAt?: string | null; isAvailable?: boolean }
        | null;

      if (!res.ok) {
        throw new Error(data?.message ?? UPDATE_ERROR_MESSAGE);
      }

      setItems((prev) =>
        prev.map((item) =>
          item.departmentId === departmentId
            ? {
                ...item,
                isAvailable: typeof data?.isAvailable === "boolean" ? data.isAvailable : nextAvailability,
                updatedAt: data?.updatedAt ?? new Date().toISOString(),
              }
            : item,
        ),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : UPDATE_ERROR_MESSAGE;
      setItems((prev) =>
        prev.map((item) =>
          item.departmentId === departmentId ? { ...item, isAvailable: current.isAvailable } : item,
        ),
      );
      setErrors((prev) => ({ ...prev, [departmentId]: message }));
      setPageError(message);
    } finally {
      setSavingIds((prev) => ({ ...prev, [departmentId]: false }));
    }
  };

  return (
    <div className="w-full min-w-0">
      <header className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">MEDICAL INFO</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{PAGE_TITLE}</h1>
        <p className="mt-1 text-sm text-slate-500">{PAGE_DESCRIPTION}</p>
        <p className="mt-1 text-xs text-slate-400">{PAGE_HELP}</p>
      </header>

      <section className="ds-panel-surface mb-5 overflow-hidden rounded-2xl px-5 py-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-x-8 gap-y-3">
            <div className="min-w-[120px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">TOTAL</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-bold leading-none text-slate-900">{items.length}</span>
                <span className="text-sm text-slate-500">{TOTAL_LABEL}</span>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200" aria-hidden="true" />

            <div className="min-w-[120px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">AVAILABLE</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold leading-none text-emerald-700">{availableCount}</span>
                <span className="text-sm text-slate-600">{AVAILABLE_LABEL}</span>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200" aria-hidden="true" />

            <div className="min-w-[120px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">UNAVAILABLE</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold leading-none text-slate-900">{unavailableCount}</span>
                <span className="text-sm text-slate-600">{UNAVAILABLE_LABEL}</span>
              </div>
            </div>
          </div>

          <div className="ds-muted-panel min-w-[220px] rounded-xl px-4 py-3 xl:text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">UPDATED</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{formatSummaryTime(latestUpdatedAt)}</p>
            <p className="mt-1 text-xs text-slate-500">{UPDATED_LABEL}</p>
          </div>
        </div>
      </section>

      {pageError ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{pageError}</div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {items.map((item) => (
          <MedicalInfoFlipCard
            key={item.departmentId}
            departmentName={item.departmentName}
            isAvailable={item.isAvailable}
            updatedAt={item.updatedAt}
            saving={Boolean(savingIds[item.departmentId])}
            error={errors[item.departmentId] ?? ""}
            onToggle={() => void toggleAvailability(item.departmentId)}
          />
        ))}
      </section>
    </div>
  );
}
