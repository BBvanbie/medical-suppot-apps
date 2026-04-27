"use client";

import { useState } from "react";

import { TablePagination } from "@/components/shared/TablePagination";
import { RequestStatusBadge } from "@/components/shared/RequestStatusBadge";
import type { EmsOperationalMode } from "@/lib/emsSettingsValidation";

export type RecentSearchResultRow = {
  hospitalId: number;
  hospitalName: string;
  departments: string[];
  address: string;
  phone: string;
  distanceKm: number | null;
  searchScore?: number;
  scoreSummary?: string[];
};

export type HospitalDepartmentStatus = {
  name: string;
  shortName: string;
  available: boolean;
};

export type HospitalProfileCard = {
  hospitalId: number;
  hospitalName: string;
  address: string;
  phone: string;
  departments: HospitalDepartmentStatus[];
};

type SearchResultsTabProps = {
  viewType: "table" | "hospital-cards";
  rows: RecentSearchResultRow[];
  profiles: HospitalProfileCard[];
  mode: "or" | "and";
  operationalMode?: EmsOperationalMode;
  selectedDepartments: string[];
  checkedIds: number[];
  onCheckedIdsChange: (ids: number[]) => void;
  selectedDepartmentsByHospital: Record<number, string[]>;
  onSelectedDepartmentsByHospitalChange: (value: Record<number, string[]>) => void;
};

const ITEMS_PER_PAGE = 20;

function getVisibleScoreSummary(scoreSummary?: string[]) {
  return (scoreSummary ?? []).filter((item) => item !== "応答実績少");
}

function SearchInfoBlock({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">{label}</p>
      <div className="mt-1 text-sm leading-6 text-slate-700">{value}</div>
    </div>
  );
}

export function SearchResultsTab({
  viewType,
  rows,
  profiles,
  mode,
  operationalMode = "STANDARD",
  selectedDepartments,
  checkedIds,
  onCheckedIdsChange,
  selectedDepartmentsByHospital,
  onSelectedDepartmentsByHospitalChange,
}: SearchResultsTabProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const isTriage = operationalMode === "TRIAGE";

  const pageData = viewType === "table" ? rows : profiles;
  const totalPages = Math.max(1, Math.ceil(pageData.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const pagedRows = rows.slice(startIndex, endIndex);
  const pagedProfiles = profiles.slice(startIndex, endIndex);

  const toggleChecked = (hospitalId: number) => {
    if (checkedIds.includes(hospitalId)) {
      onCheckedIdsChange(checkedIds.filter((id) => id !== hospitalId));
      return;
    }
    onCheckedIdsChange([...checkedIds, hospitalId]);
  };

  const renderDepartments = (row: RecentSearchResultRow) => {
    if (mode === "and") return selectedDepartments.join(", ");
    return row.departments.join(", ");
  };

  const toggleDepartmentSelection = (hospitalId: number, departmentShortName: string) => {
    const current = selectedDepartmentsByHospital[hospitalId] ?? [];
    if (current.includes(departmentShortName)) {
      onSelectedDepartmentsByHospitalChange({
        ...selectedDepartmentsByHospital,
        [hospitalId]: current.filter((v) => v !== departmentShortName),
      });
      return;
    }
    onSelectedDepartmentsByHospitalChange({
      ...selectedDepartmentsByHospital,
      [hospitalId]: [...current, departmentShortName],
    });
  };

  return (
    <section
      className={`rounded-2xl p-5 ${
        isTriage
          ? "border border-rose-200/80 bg-white shadow-[0_24px_56px_-42px_rgba(190,24,93,0.45)]"
          : "ds-panel-surface"
      }`}
    >
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">{isTriage ? "トリアージ候補病院" : "検索結果"}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {isTriage ? "初動比較しやすい順で並べます。距離、応答傾向、滞留状況を見ながら即判断してください。" : "1ページ20件で表示します。優先度順のカード一覧で比較できます。"}
          </p>
        </div>
        <p className="text-xs text-slate-500">件数: {pageData.length}</p>
      </div>

      {viewType === "table" ? (
        <div className="space-y-3" data-testid="hospital-search-results-list">
          {pagedRows.map((row) => {
            const selected = checkedIds.includes(row.hospitalId);
            const visibleScoreSummary = getVisibleScoreSummary(row.scoreSummary);
            return (
              <button
                key={row.hospitalId}
                type="button"
                onClick={() => toggleChecked(row.hospitalId)}
                className={`ds-table-surface w-full rounded-2xl border px-4 py-4 text-left transition ${
                  selected
                    ? isTriage
                      ? "border-rose-300 bg-rose-50 shadow-[0_22px_44px_-28px_rgba(190,24,93,0.45)]"
                      : "border-blue-200 bg-blue-50/70 shadow-[0_18px_36px_-26px_rgba(37,99,235,0.35)]"
                    : isTriage
                      ? "border-slate-200 bg-white hover:border-rose-300 hover:bg-rose-50/35"
                      : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/35"
                }`}
                data-testid="hospital-search-result-row"
                data-hospital-id={row.hospitalId}
                data-search-score={row.searchScore ?? ""}
                aria-pressed={selected}
              >
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {selected ? <RequestStatusBadge status="選定中" ariaLabelPrefix="選択状態" /> : null}
                      <p className="text-base font-bold text-slate-950">{row.hospitalName}</p>
                      <p className="text-xs font-semibold text-slate-500">病院ID: {row.hospitalId}</p>
                      {row.distanceKm != null ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          {row.distanceKm.toFixed(1)} km
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                      {visibleScoreSummary.slice(0, 3).join(" / ") || "比較情報なし"}
                    </p>
                  </div>
                  <div className="flex items-start justify-end">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                        selected
                          ? isTriage
                            ? "border-rose-200 bg-rose-100 text-rose-700"
                            : "border-blue-200 bg-blue-100 text-blue-700"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {selected ? (isTriage ? "送信候補" : "選択中") : isTriage ? "即時候補へ追加" : "タップして選択"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 border-t border-slate-100 pt-3 md:grid-cols-2 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,1fr)]">
                  <SearchInfoBlock
                    label="選定科目"
                    value={<p className="line-clamp-2">{renderDepartments(row) || "-"}</p>}
                  />
                  <SearchInfoBlock
                    label="住所"
                    value={<p className="line-clamp-2">{row.address || "-"}</p>}
                  />
                  <SearchInfoBlock label="電話" value={row.phone || "-"} />
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {pagedProfiles.map((profile) => (
            <article
              key={profile.hospitalId}
              className={`rounded-2xl p-4 ${
                isTriage
                  ? "border border-rose-100 bg-white"
                  : "ds-muted-panel border-blue-100/80"
              }`}
            >
              <div>
                <h3 className="text-base font-bold text-slate-800">{profile.hospitalName}</h3>
                <p className="mt-1 text-xs text-slate-500">病院ID: {profile.hospitalId}</p>
              </div>
              <p className="mt-1 text-sm text-slate-700">{profile.address}</p>
              <p className="mt-1 text-sm text-slate-700">電話番号: {profile.phone || "-"}</p>
              <p className="mt-2 text-xs font-semibold text-slate-600">
                選択科目: {(selectedDepartmentsByHospital[profile.hospitalId] ?? []).length} 件
              </p>

              <div className="mt-3 grid grid-cols-3 gap-2 lg:grid-cols-6">
                {profile.departments.map((department) => (
                  <button
                    key={`${profile.hospitalId}-${department.shortName}`}
                    type="button"
                    disabled={!department.available}
                    onClick={() => toggleDepartmentSelection(profile.hospitalId, department.shortName)}
                    className={`flex min-h-12 items-center justify-center rounded-xl px-2 py-2 text-center text-[11px] font-semibold transition ${
                      !department.available
                        ? "cursor-not-allowed bg-slate-200 text-slate-500"
                        : (selectedDepartmentsByHospital[profile.hospitalId] ?? []).includes(department.shortName)
                          ? isTriage
                            ? "bg-rose-50 text-rose-700 ring-1 ring-rose-400"
                            : "bg-[var(--accent-blue-soft)] text-[var(--accent-blue)] ring-1 ring-[var(--accent-blue)]"
                          : "bg-white text-slate-800 ring-1 ring-slate-200 hover:ring-slate-300"
                    }`}
                  >
                    {department.name}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      {viewType === "table" ? (
        <div
          className={`mt-4 rounded-xl px-4 py-3 text-sm text-slate-600 ${
            isTriage ? "border border-rose-100 bg-white/80" : "ds-muted-panel border-blue-100/70"
          }`}
        >
          選択中病院: {checkedIds.length} 件
        </div>
      ) : null}

      <TablePagination
        className="mt-5"
        currentPage={currentPage}
        totalPages={totalPages}
        onPrevious={() => setCurrentPage((p) => Math.max(1, p - 1))}
        onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
      />
    </section>
  );
}
