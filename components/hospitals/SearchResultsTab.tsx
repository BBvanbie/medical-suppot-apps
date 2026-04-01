"use client";

import { useState } from "react";

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
  selectedDepartments: string[];
  checkedIds: number[];
  onCheckedIdsChange: (ids: number[]) => void;
  selectedDepartmentsByHospital: Record<number, string[]>;
  onSelectedDepartmentsByHospitalChange: (value: Record<number, string[]>) => void;
};

const ITEMS_PER_PAGE = 20;

export function SearchResultsTab({
  viewType,
  rows,
  profiles,
  mode,
  selectedDepartments,
  checkedIds,
  onCheckedIdsChange,
  selectedDepartmentsByHospital,
  onSelectedDepartmentsByHospitalChange,
}: SearchResultsTabProps) {
  const [currentPage, setCurrentPage] = useState(1);

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
    <section className="rounded-2xl border border-blue-100/80 bg-white p-5 ring-1 ring-blue-100/70">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">検索結果</h2>
          <p className="mt-1 text-sm text-slate-500">
            1ページ20件で表示します。表形式は優先度スコア順です。
          </p>
        </div>
        <p className="text-xs text-slate-500">件数: {pageData.length}</p>
      </div>

      {viewType === "table" ? (
        <div className="overflow-x-auto rounded-2xl bg-slate-50/70 ring-1 ring-blue-100/70">
          <table className="min-w-[1080px] w-full table-fixed text-sm" data-testid="hospital-search-results-table">
            <colgroup>
              <col className="w-[78px]" />
              <col className="w-[220px]" />
              <col className="w-[210px]" />
              <col className="w-[170px]" />
              <col className="w-[250px]" />
              <col className="w-[136px]" />
              <col className="w-[96px]" />
              <col className="w-[56px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold tracking-wide text-slate-500">
                <th className="px-3 py-3">病院ID</th>
                <th className="px-3 py-3">病院名</th>
                <th className="px-3 py-3">優先度</th>
                <th className="px-3 py-3">科目</th>
                <th className="px-3 py-3">住所</th>
                <th className="px-3 py-3">電話番号</th>
                <th className="px-3 py-3">距離</th>
                <th className="px-3 py-3" aria-label="check action" />
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((row) => (
                <tr
                  key={row.hospitalId}
                  className="border-t border-slate-200/80 bg-white hover:bg-blue-50/40"
                  data-testid="hospital-search-result-row"
                  data-hospital-id={row.hospitalId}
                  data-search-score={row.searchScore ?? ""}
                >
                  <td className="px-3 py-3 font-semibold text-slate-700">{row.hospitalId}</td>
                  <td className="px-3 py-3 text-slate-700">
                    <p className="line-clamp-2 break-words font-medium">{row.hospitalName}</p>
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    <p className="text-sm font-semibold text-slate-800" data-testid="hospital-search-score">
                      {row.searchScore != null ? row.searchScore.toFixed(1) : "-"}
                    </p>
                    <p className="mt-1 line-clamp-3 text-[11px] leading-4 text-slate-500">
                      {row.scoreSummary?.slice(0, 3).join(" / ") || "優先度情報なし"}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    <p className="line-clamp-2 break-words">{renderDepartments(row) || "-"}</p>
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    <p className="line-clamp-3 break-words leading-5">{row.address}</p>
                  </td>
                  <td className="px-3 py-3 text-slate-700">{row.phone || "-"}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-slate-700">
                    {row.distanceKm == null ? "-" : `${row.distanceKm.toFixed(1)} km`}
                  </td>
                  <td className="px-3 py-3 text-center">
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
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {pagedProfiles.map((profile) => (
            <article key={profile.hospitalId} className="rounded-2xl border border-blue-100/80 bg-slate-50/70 p-4 ring-1 ring-blue-100/70">
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
                          ? "bg-[var(--accent-blue-soft)] text-[var(--accent-blue)] ring-1 ring-[var(--accent-blue)]"
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
        <div className="mt-4 rounded-xl bg-blue-50/40 px-4 py-3 text-sm text-slate-600 ring-1 ring-blue-100/70">
          選択中病院: {checkedIds.length} 件
        </div>
      ) : null}

      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
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
          className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          次へ
        </button>
      </div>
    </section>
  );
}
