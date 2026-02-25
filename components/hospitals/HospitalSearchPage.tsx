"use client";

import { useState } from "react";

import { Sidebar } from "@/components/home/Sidebar";

import { RecentSearchPayload, SearchConditionsTab } from "./SearchConditionsTab";
import { HospitalProfileCard, RecentSearchResultRow, SearchResultsTab } from "./SearchResultsTab";

type Department = {
  id: number;
  name: string;
  shortName: string;
};

type HospitalSearchPageProps = {
  departments: Department[];
  municipalities: string[];
  hospitals: string[];
};

type TabId = "conditions" | "results" | "history";

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "conditions", label: "検索条件" },
  { id: "results", label: "検索結果" },
  { id: "history", label: "送信履歴" },
];

type SearchResponse = {
  viewType: "table" | "hospital-cards";
  rows: RecentSearchResultRow[];
  profiles: HospitalProfileCard[];
  mode: "or" | "and";
  selectedDepartments: string[];
};

export function HospitalSearchPage({ departments, municipalities, hospitals }: HospitalSearchPageProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("conditions");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [resultVersion, setResultVersion] = useState(0);
  const [resultData, setResultData] = useState<SearchResponse>({
    viewType: "table",
    rows: [],
    profiles: [],
    mode: "or",
    selectedDepartments: [],
  });

  const runSearchRequest = async (payload: Record<string, unknown>) => {
    setSearching(true);
    setError("");

    try {
      const response = await fetch("/api/hospitals/recent-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as SearchResponse | { message: string };
      if (!response.ok) {
        throw new Error("message" in data ? data.message : "検索に失敗しました。");
      }

      setResultData(data as SearchResponse);
      setResultVersion((v) => v + 1);
      setActiveTab("results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "検索に失敗しました。");
    } finally {
      setSearching(false);
    }
  };

  const runRecentSearch = async (payload: RecentSearchPayload) => {
    await runSearchRequest({
      searchType: "recent",
      ...payload,
    });
  };

  const runMunicipalitySearch = async (municipality: string) => {
    await runSearchRequest({
      searchType: "municipality",
      municipality,
    });
  };

  const runHospitalSearch = async (hospitalName: string) => {
    await runSearchRequest({
      searchType: "hospital",
      hospitalName,
    });
  };

  return (
    <div className="dashboard-shell h-screen overflow-hidden bg-[var(--dashboard-bg)] text-slate-900">
      <div className="flex h-full">
        <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen((v) => !v)} />

        <main className="flex min-w-0 flex-1 flex-col px-8 py-6">
          <header className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-teal)]">HOSPITAL SEARCH</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">病院検索</h1>
            <p className="mt-1 text-sm text-slate-500">検索条件・検索結果・送信履歴をタブで管理します。</p>
          </header>

          <div className="mb-5 flex gap-2 rounded-2xl border border-slate-200 bg-white p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-[var(--accent-blue-soft)] text-[var(--accent-blue)]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-auto pr-1">
            {activeTab === "conditions" && (
              <SearchConditionsTab
                departments={departments}
                municipalities={municipalities}
                hospitals={hospitals}
                onRecentSearchExecute={runRecentSearch}
                onMunicipalitySearchExecute={runMunicipalitySearch}
                onHospitalSearchExecute={runHospitalSearch}
                searching={searching}
              />
            )}

            {activeTab === "results" && (
              <SearchResultsTab
                key={`results-${resultVersion}`}
                viewType={resultData.viewType}
                rows={resultData.rows}
                profiles={resultData.profiles}
                mode={resultData.mode}
                selectedDepartments={resultData.selectedDepartments}
              />
            )}

            {activeTab === "history" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
                <h2 className="text-lg font-bold text-slate-800">送信履歴</h2>
                <p className="mt-2 text-sm text-slate-500">次工程で送信履歴一覧を実装します。</p>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
