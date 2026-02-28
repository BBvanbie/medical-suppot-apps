"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Sidebar } from "@/components/home/Sidebar";
import { RequestStatusBadge } from "@/components/shared/RequestStatusBadge";

import { MunicipalitySearchPayload, RecentSearchPayload, SearchConditionsTab } from "./SearchConditionsTab";
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

type CaseContext = {
  caseId: string;
  name: string;
  age: string;
  address: string;
  phone?: string;
  gender?: string;
  birthSummary?: string;
  adl?: string;
  allergy?: string;
  weight?: string;
  relatedPeople?: Array<{ name: string; relation: string; phone: string }>;
  pastHistories?: Array<{ disease: string; clinic: string }>;
  chiefComplaint: string;
  dispatchSummary: string;
  vitals?: Array<{
    measuredAt: string;
    consciousnessType: "jcs" | "gcs";
    consciousnessValue: string;
    respiratoryRate: string;
    pulseRate: string;
    spo2: string;
    temperature: string;
    temperatureUnavailable: boolean;
  }>;
  changedFindings?: Array<{ major: string; middle: string; detail: string }>;
  updatedAt: string;
};

type RequestHospital = {
  hospitalId: number;
  hospitalName: string;
  address: string;
  phone: string;
  departments: string[];
  distanceKm: number | null;
};

type TransferRequestDraft = {
  requestId: string;
  caseId: string;
  createdAt: string;
  caseContext: CaseContext | null;
  searchMode: "or" | "and";
  selectedDepartments: string[];
  hospitals: RequestHospital[];
};

type SentHistoryItem = {
  targetId: number;
  requestId: string;
  caseId: string;
  sentAt: string;
  status?: "未読" | "既読" | "要相談" | "受入可能" | "受入不可" | "搬送決定" | "辞退";
  hospitalName?: string;
  selectedDepartments?: string[];
  canDecide?: boolean;
  canConsult?: boolean;
  consultComment?: string;
  emsReplyComment?: string;
};

export function HospitalSearchPage({ departments, municipalities, hospitals }: HospitalSearchPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("conditions");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [resultVersion, setResultVersion] = useState(0);
  const [selectedHospitalIds, setSelectedHospitalIds] = useState<number[]>([]);
  const [selectedDepartmentsByHospital, setSelectedDepartmentsByHospital] = useState<Record<number, string[]>>({});
  const [caseContext, setCaseContext] = useState<CaseContext | null>(null);
  const [sendHistory, setSendHistory] = useState<SentHistoryItem[]>([]);
  const [resultData, setResultData] = useState<SearchResponse>({
    viewType: "table",
    rows: [],
    profiles: [],
    mode: "or",
    selectedDepartments: [],
  });

  useEffect(() => {
    const caseId = searchParams.get("caseId");
    try {
      const directKey = caseId ? `case-context:${caseId}` : "";
      const activeKey = sessionStorage.getItem("active-case-context-key") ?? "";
      const raw =
        (directKey ? sessionStorage.getItem(directKey) : null) ??
        (activeKey ? sessionStorage.getItem(activeKey) : null);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CaseContext;
      if (parsed?.caseId) setCaseContext(parsed);
    } catch {
      setCaseContext(null);
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab !== "results") return;
    contentScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [activeTab, resultVersion]);

  useEffect(() => {
    if (activeTab !== "history") return;
    const caseId = caseContext?.caseId ?? searchParams.get("caseId") ?? "";
    if (!caseId) {
      setSendHistory([]);
      return;
    }
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/cases/send-history?caseId=${encodeURIComponent(caseId)}`);
        if (!res.ok) {
          setSendHistory([]);
          return;
        }
        const data = (await res.json()) as { rows?: SentHistoryItem[] };
        setSendHistory(Array.isArray(data.rows) ? data.rows : []);
      } catch {
        setSendHistory([]);
      }
    };
    void fetchHistory();
  }, [activeTab, caseContext?.caseId, searchParams]);

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

      const normalized = data as SearchResponse;
      setResultData(normalized);
      setSelectedDepartmentsByHospital({});
      if (normalized.viewType === "hospital-cards" && normalized.profiles.length === 1) {
        setSelectedHospitalIds([normalized.profiles[0].hospitalId]);
      } else {
        setSelectedHospitalIds([]);
      }
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

  const runMunicipalitySearch = async (payload: MunicipalitySearchPayload) => {
    const municipality = payload.municipality.trim();
    if (!municipality) {
      setError("市区名を入力してください。");
      return;
    }
    await runSearchRequest({
      searchType: "municipality",
      ...payload,
      municipality,
    });
  };

  const runHospitalSearch = async (hospitalName: string) => {
    await runSearchRequest({
      searchType: "hospital",
      hospitalName,
    });
  };

  const handleSubmitRequest = () => {
    if (selectedHospitalIds.length === 0) {
      setError("送信先病院を選択してください。");
      return;
    }

    const hospitalMap = new Map<number, RequestHospital>();
    for (const row of resultData.rows) {
      hospitalMap.set(row.hospitalId, {
        hospitalId: row.hospitalId,
        hospitalName: row.hospitalName,
        address: row.address,
        phone: row.phone,
        departments: row.departments,
        distanceKm: row.distanceKm,
      });
    }
    for (const profile of resultData.profiles) {
      if (hospitalMap.has(profile.hospitalId)) continue;
      hospitalMap.set(profile.hospitalId, {
        hospitalId: profile.hospitalId,
        hospitalName: profile.hospitalName,
        address: profile.address,
        phone: profile.phone,
        departments: profile.departments.filter((d) => d.available).map((d) => d.shortName),
        distanceKm: null,
      });
    }

    const selectedHospitals = selectedHospitalIds
      .map((hospitalId) => {
        const row = hospitalMap.get(hospitalId);
        if (!row) return null;
        if (resultData.viewType !== "hospital-cards") return row;
        const selectedShortNames = selectedDepartmentsByHospital[hospitalId] ?? [];
        return { ...row, departments: selectedShortNames };
      })
      .filter((item): item is RequestHospital => Boolean(item));

    if (resultData.viewType === "hospital-cards") {
      const selectedShortNames = Array.from(
        new Set(selectedHospitalIds.flatMap((hospitalId) => selectedDepartmentsByHospital[hospitalId] ?? [])),
      );
      if (selectedShortNames.length === 0) {
        setError("個別検索では送信前に診療科目を選択してください。");
        return;
      }
    }

    const caseId = caseContext?.caseId ?? searchParams.get("caseId") ?? "";
    const requestId = `${caseId || "NOCASE"}-${Date.now()}`;

    const draft: TransferRequestDraft = {
      requestId,
      caseId,
      createdAt: new Date().toISOString(),
      caseContext,
      searchMode: resultData.mode,
      selectedDepartments:
        resultData.viewType === "hospital-cards"
          ? Array.from(
              new Set(
                selectedHospitalIds.flatMap((hospitalId) => selectedDepartmentsByHospital[hospitalId] ?? []),
              ),
            )
          : resultData.selectedDepartments,
      hospitals: selectedHospitals,
    };

    try {
      sessionStorage.setItem(`hospital-request:${requestId}`, JSON.stringify(draft));
      sessionStorage.setItem("active-hospital-request-key", `hospital-request:${requestId}`);
    } catch {
      setError("確認ページへのデータ保存に失敗しました。");
      return;
    }

    router.push(`/hospitals/request/confirm?requestId=${encodeURIComponent(requestId)}`);
  };

  const canSubmitRequest = (() => {
    if (activeTab !== "results" || selectedHospitalIds.length === 0) return false;
    if (resultData.viewType !== "hospital-cards") return true;
    return selectedHospitalIds.some((hospitalId) => (selectedDepartmentsByHospital[hospitalId] ?? []).length > 0);
  })();

  return (
    <div className="dashboard-shell h-screen overflow-hidden bg-[var(--dashboard-bg)] text-slate-900">
      <div className="flex h-full">
        <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen((v) => !v)} />

        <main className="flex min-w-0 flex-1 flex-col px-8 py-6">
          <header className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-teal)]">HOSPITAL SEARCH</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">病院検索</h1>
            <p className="mt-1 text-sm text-slate-500">検索条件・検索結果・送信履歴をタブで操作します。</p>
            {caseContext ? (
              <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-900">
                <p className="font-semibold">事案連携中: {caseContext.caseId}</p>
                <p className="mt-1">
                  {caseContext.name} {caseContext.age ? `(${caseContext.age}歳)` : ""} / {caseContext.address}
                </p>
                {caseContext.chiefComplaint ? <p className="mt-1">主訴: {caseContext.chiefComplaint}</p> : null}
              </div>
            ) : null}
          </header>

          <div className="mb-5 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-2">
            <div className="flex gap-2">
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
            <button
              type="button"
              onClick={handleSubmitRequest}
              disabled={!canSubmitRequest}
              className="inline-flex w-44 items-center justify-center rounded-xl bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[color-mix(in_srgb,var(--accent-blue),#000_10%)] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              受入要請送信
            </button>
          </div>

          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}

          <div ref={contentScrollRef} className="min-h-0 flex-1 overflow-auto pr-1">
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
                checkedIds={selectedHospitalIds}
                onCheckedIdsChange={setSelectedHospitalIds}
                selectedDepartmentsByHospital={selectedDepartmentsByHospital}
                onSelectedDepartmentsByHospitalChange={setSelectedDepartmentsByHospital}
              />
            )}

            {activeTab === "history" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
                <h2 className="text-lg font-bold text-slate-800">送信履歴</h2>
                <p className="mt-2 text-sm text-slate-500">これまでに送信した受入要請を表示します。</p>
                {!caseContext?.caseId && !searchParams.get("caseId") ? (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    事案情報と連携した状態で病院検索を開くと、送信履歴を表示できます。
                  </div>
                ) : null}
                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-[980px] table-fixed text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                      <tr>
                        <th className="px-4 py-3">送信時刻</th>
                        <th className="px-4 py-3">事案ID</th>
                        <th className="px-4 py-3">病院</th>
                        <th className="px-4 py-3">ステータス</th>
                        <th className="px-4 py-3">選択科目</th>
                        <th className="px-4 py-3" aria-label="case action" />
                      </tr>
                    </thead>
                    <tbody>
                      {sendHistory.map((item) => {
                        const sentAt = new Date(item.sentAt);
                        const sentAtLabel = Number.isNaN(sentAt.getTime()) ? item.sentAt : sentAt.toLocaleString("ja-JP");
                        return (
                          <tr key={`${item.requestId}-${item.targetId}`} className="border-t border-slate-100">
                            <td className="px-4 py-3 text-slate-700">{sentAtLabel}</td>
                            <td className="px-4 py-3 font-semibold text-slate-700">{item.caseId || "-"}</td>
                            <td className="px-4 py-3 text-slate-700">{item.hospitalName || "-"}</td>
                            <td className="px-4 py-3">
                              <RequestStatusBadge status={item.status} />
                            </td>
                            <td className="px-4 py-3 text-slate-700">{item.selectedDepartments?.join(", ") || "-"}</td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                disabled={!item.caseId}
                                onClick={() => router.push(`/cases/${encodeURIComponent(item.caseId)}`)}
                                className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                              >
                                事案情報
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {sendHistory.length === 0 ? (
                        <tr>
                          <td className="px-4 py-6 text-sm text-slate-500" colSpan={6}>
                            送信履歴はまだありません。
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
