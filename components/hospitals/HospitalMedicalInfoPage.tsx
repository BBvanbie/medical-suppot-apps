"use client";

import { useEffect, useState } from "react";

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

export function HospitalMedicalInfoPage({ initialItems }: HospitalMedicalInfoPageProps) {
  const [items, setItems] = useState(initialItems);
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    setItems((current) => {
      const nextById = new Map(initialItems.map((item) => [item.departmentId, item]));
      return current.map((item) => {
        if (savingIds[item.departmentId]) return item;
        return nextById.get(item.departmentId) ?? item;
      });
    });
  }, [initialItems, savingIds]);

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
        throw new Error(data?.message ?? "診療情報の更新に失敗しました。");
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
      const message = error instanceof Error ? error.message : "診療情報の更新に失敗しました。";
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
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">診療情報</h1>
        <p className="mt-1 text-sm text-slate-500">診療科ごとの現在の受入可否を更新できます</p>
        <p className="mt-1 text-xs text-slate-400">カードをクリックすると診療可能 / 診療不可が切り替わります</p>
      </header>

      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">TOTAL</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{items.length}</p>
          <p className="mt-1 text-sm text-slate-500">全診療科数</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-[0_18px_40px_-28px_rgba(21,128,61,0.18)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">AVAILABLE</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{availableCount}</p>
          <p className="mt-1 text-sm text-slate-500">診療可能件数</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-100/70 p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.12)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">UNAVAILABLE</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{unavailableCount}</p>
          <p className="mt-1 text-sm text-slate-500">診療不可件数</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">UPDATED</p>
          <p className="mt-2 text-lg font-bold text-slate-900">{formatSummaryTime(latestUpdatedAt)}</p>
          <p className="mt-1 text-sm text-slate-500">最終全体更新</p>
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
