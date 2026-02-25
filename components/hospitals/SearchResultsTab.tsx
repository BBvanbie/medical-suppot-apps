"use client";

import { useMemo, useState } from "react";

export type RecentSearchResultRow = {
  hospitalId: number;
  hospitalName: string;
  departments: string[];
  address: string;
  phone: string;
  distanceKm: number | null;
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
  selectedDepartments: string[];
};

const ITEMS_PER_PAGE = 20;

export function SearchResultsTab({ viewType, rows, profiles, mode, selectedDepartments }: SearchResultsTabProps) {
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => {
        if (a.distanceKm == null && b.distanceKm == null) return 0;
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      }),
    [rows],
  );

  const pageData = viewType === "table" ? sortedRows : profiles;
  const totalPages = Math.max(1, Math.ceil(pageData.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const pagedRows = sortedRows.slice(startIndex, endIndex);
  const pagedProfiles = profiles.slice(startIndex, endIndex);

  const toggleChecked = (hospitalId: number) => {
    setCheckedIds((prev) =>
      prev.includes(hospitalId) ? prev.filter((id) => id !== hospitalId) : [...prev, hospitalId],
    );
  };

  const renderDepartments = (row: RecentSearchResultRow) => {
    if (mode === "and") return selectedDepartments.join(", ");
    return row.departments.join(", ");
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">検索結果</h2>
          <p className="mt-1 text-sm text-slate-500">1ページ20件で表示します。</p>
        </div>
        <p className="text-xs text-slate-500">件数: {pageData.length}</p>
      </div>

      {viewType === "table" ? (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-[1120px] table-fixed border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold tracking-wide text-slate-500">
                  <th className="px-4 py-3">病院ID</th>
                  <th className="px-4 py-3">病院名</th>
                  <th className="px-4 py-3">科目</th>
                  <th className="px-4 py-3">住所</th>
                  <th className="px-4 py-3">電話番号</th>
                  <th className="px-4 py-3">距離</th>
                  <th className="px-4 py-3" aria-label="check action" />
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row) => (
                  <tr key={row.hospitalId} className="border-t border-slate-100 hover:bg-blue-50/30">
                    <td className="px-4 py-3 font-semibold text-slate-700">{row.hospitalId}</td>
                    <td className="px-4 py-3 text-slate-700">{row.hospitalName}</td>
                    <td className="px-4 py-3 text-slate-700">{renderDepartments(row)}</td>
                    <td className="px-4 py-3 text-slate-700">{row.address}</td>
                    <td className="px-4 py-3 text-slate-700">{row.phone || "-"}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.distanceKm == null ? "-" : `${row.distanceKm.toFixed(1)} km`}
                    </td>
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={checkedIds.includes(row.hospitalId)}
                          onChange={() => toggleChecked(row.hospitalId)}
                          className="h-4 w-4 rounded border-slate-300 text-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                        />
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-sm text-slate-600">選択中病院: {checkedIds.length} 件</p>
            <button
              type="button"
              disabled={checkedIds.length === 0}
              className="inline-flex items-center rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[color-mix(in_srgb,var(--accent-blue),#000_10%)] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              受け入れ要請送信
            </button>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {pagedProfiles.map((profile) => (
            <article key={profile.hospitalId} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
              <h3 className="text-base font-bold text-slate-800">{profile.hospitalName}</h3>
              <p className="mt-1 text-xs text-slate-500">病院ID: {profile.hospitalId}</p>
              <p className="mt-1 text-sm text-slate-700">{profile.address}</p>
              <p className="mt-1 text-sm text-slate-700">電話番号: {profile.phone || "-"}</p>

              <div className="mt-3 grid grid-cols-3 gap-2 lg:grid-cols-6">
                {profile.departments.map((department) => (
                  <div
                    key={`${profile.hospitalId}-${department.shortName}`}
                    className={`flex min-h-12 items-center justify-center rounded-lg border px-2 py-2 text-center text-[11px] font-semibold ${
                      department.available
                        ? "border-blue-200 bg-[var(--accent-blue-soft)] text-[var(--accent-blue)]"
                        : "border-slate-200 bg-slate-200 text-slate-500"
                    }`}
                  >
                    {department.name}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          前へ
        </button>
        <p className="text-xs text-slate-500">
          {currentPage} / {totalPages}
        </p>
        <button
          type="button"
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          次へ
        </button>
      </div>
    </section>
  );
}
