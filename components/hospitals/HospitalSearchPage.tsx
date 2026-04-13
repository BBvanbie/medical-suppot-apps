"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { OfflineProvider } from "@/components/offline/OfflineProvider";
import { OfflineStatusBanner } from "@/components/offline/OfflineStatusBanner";
import { useOfflineState } from "@/components/offline/useOfflineState";
import { Sidebar } from "@/components/home/Sidebar";
import { BUTTON_BASE_CLASS, BUTTON_VARIANT_CLASS } from "@/components/shared/buttonStyles";
import { RequestStatusBadge } from "@/components/shared/RequestStatusBadge";
import { formatDateTimeMdHm } from "@/lib/dateTimeFormat";
import type { ChangedFindingEntry } from "@/lib/caseFindingsSummary";
import { cacheHospitalSearchRows, saveOfflineSearchState, searchHospitalsFromCache } from "@/lib/offline/offlineHospitalSearch";
import { enqueueHospitalRequestSend } from "@/lib/offline/offlineRequestQueue";

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
  { id: "conditions", label: "\u691c\u7d22\u6761\u4ef6" },
  { id: "results", label: "\u691c\u7d22\u7d50\u679c" },
  { id: "history", label: "\u9001\u4fe1\u5c65\u6b74" },
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
  awareDate?: string;
  awareTime?: string;
  dispatchAddress?: string;
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
  changedFindings?: ChangedFindingEntry[];
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
  status?: "未読" | "既読" | "要相談" | "受入可能" | "受入不可" | "搬送決定" | "搬送辞退";
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
  const { isOffline } = useOfflineState();
  const isOfflineRestricted = isOffline;
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("conditions");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
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
        const res = await fetch(`/api/cases/send-history?caseRef=${encodeURIComponent(caseId)}`);
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
    setNotice("");

    try {
      if (isOfflineRestricted) {
        const searchType = String(payload.searchType ?? "");
        const offlineRows = await searchHospitalsFromCache({
          hospitalName: searchType === "hospital" ? String(payload.hospitalName ?? "") : undefined,
          municipality: searchType === "municipality" ? String(payload.municipality ?? "") : undefined,
          departments: Array.isArray(payload.departmentShortNames) ? (payload.departmentShortNames as string[]) : [],
        });
        setResultData({
          viewType: searchType === "hospital" ? "hospital-cards" : "table",
          rows: offlineRows.map((row) => ({
            hospitalId: row.hospitalId,
            hospitalName: row.hospitalName,
            departments: row.departments,
            address: row.address,
            phone: row.phone,
            distanceKm: row.distanceKm ?? null,
          })),
          profiles: offlineRows.map((row) => ({
            hospitalId: row.hospitalId,
            hospitalName: row.hospitalName,
            address: row.address,
            phone: row.phone,
            departments: row.departments.map((department) => ({ name: department, shortName: department, available: true })),
          })),
          mode: (payload.mode as "or" | "and") ?? "or",
          selectedDepartments: Array.isArray(payload.departmentShortNames) ? (payload.departmentShortNames as string[]) : [],
        });
        setSelectedDepartmentsByHospital({});
        setSelectedHospitalIds([]);
        setResultVersion((v) => v + 1);
        setActiveTab("results");
        setNotice("オフライン中のため、端末に保存済みの病院情報から簡易検索を行いました。");
        return;
      }

      const response = await fetch("/api/hospitals/recent-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as SearchResponse | { message: string };
      if (!response.ok) {
        throw new Error("message" in data ? data.message : "病院検索に失敗しました。");
      }

      const normalized = data as SearchResponse;
      await cacheHospitalSearchRows(
        normalized.rows.map((row) => ({
          hospitalId: row.hospitalId,
          hospitalName: row.hospitalName,
          address: row.address,
          phone: row.phone,
          departments: row.departments,
          distanceKm: row.distanceKm,
        })),
      );
      await saveOfflineSearchState("last-hospital-search", payload);
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
      setError(e instanceof Error ? e.message : "病院検索に失敗しました。");
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

  const handleSubmitRequest = async () => {
    if (selectedHospitalIds.length === 0) {
      setError("送信対象の病院を選択してください。");
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
        setError("個別検索では送信対象の診療科目を選択してください。");
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
      if (isOfflineRestricted) {
        await enqueueHospitalRequestSend({
          serverCaseId: caseId || undefined,
          payload: draft,
        });
        setNotice("オフラインのため、受入要請送信を未送信キューに保存しました。");
        setSelectedHospitalIds([]);
        return;
      }
      sessionStorage.setItem(`hospital-request:${requestId}`, JSON.stringify(draft));
      sessionStorage.setItem("active-hospital-request-key", `hospital-request:${requestId}`);
    } catch {
      setError("確認画面用データの保存に失敗しました。");
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
    <OfflineProvider>
      <div className="dashboard-shell h-screen overflow-hidden bg-[var(--dashboard-bg)] text-slate-900">
        <OfflineStatusBanner />
      <div className="flex h-full">
        <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen((v) => !v)} />

        <main className="app-shell-main flex min-w-0 flex-1 flex-col">
          <header className="page-hero-copy page-hero-copy--tight mb-4">
            <p className="portal-eyebrow portal-eyebrow--ems">HOSPITAL SEARCH</p>
            <h1 className="page-hero-title page-hero-title--sm">病院検索</h1>
            <p className="page-hero-description">検索条件、検索結果、送信履歴をタブで切り替えて確認できます。</p>
            {caseContext ? (
              <div className="ds-muted-panel mt-2 rounded-xl border-blue-100 px-4 py-2.5 text-xs text-blue-900">
                <p className="font-semibold">事案選定中: {caseContext.caseId}</p>
                <p className="mt-1">
                  {caseContext.name} {caseContext.age ? `(${caseContext.age})` : ""} / {caseContext.address}
                </p>
                {caseContext.chiefComplaint ? <p className="mt-1">主訴: {caseContext.chiefComplaint}</p> : null}
              </div>
            ) : null}
          </header>

          <div className="page-toolbar content-card content-card--compact mb-4 border-blue-100/80">
            <div className="flex gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                    className={`${BUTTON_BASE_CLASS} rounded-xl px-4 py-2 text-sm ${
                      activeTab === tab.id
                        ? "border border-blue-200 bg-[var(--accent-blue-soft)] text-[var(--accent-blue)]"
                      : "ds-button--secondary text-slate-600 hover:border-blue-200 hover:bg-blue-50/60 hover:text-blue-700"
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
              className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.primary} inline-flex w-44 items-center justify-center rounded-xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-300`}
            >
              受入要請送信
            </button>
          </div>

          {isOfflineRestricted ? (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">オフライン中のため、病院情報は最新ではない可能性があります。</div>
          ) : null}
          {notice ? (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>
          ) : null}
          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}

          <div ref={contentScrollRef} className="page-frame page-frame--wide page-stack page-stack--lg min-h-0 flex-1 overflow-auto pr-1">
            {activeTab === "conditions" && (
              <SearchConditionsTab
                departments={departments}
                municipalities={municipalities}
                hospitals={hospitals}
                dispatchAddress={caseContext?.dispatchAddress ?? ""}
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
              <section className="ds-panel-surface rounded-2xl p-6">
                <h2 className="text-lg font-bold text-slate-800">送信履歴</h2>
                <p className="mt-2 text-sm text-slate-500">これまでに送信した受入要請を表示します。</p>
                {!caseContext?.caseId && !searchParams.get("caseId") ? (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    事案情報と連携した状態で病院検索を開くと、送信履歴を表示できます。
                  </div>
                ) : null}
                <div className="mt-4 space-y-3">
                  {sendHistory.map((item) => {
                    const sentAtLabel = formatDateTimeMdHm(item.sentAt);
                    return (
                      <article
                        key={`${item.requestId}-${item.targetId}`}
                        className="ds-table-surface rounded-2xl border border-slate-200 px-4 py-4"
                      >
                        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <RequestStatusBadge status={item.status} />
                              <p className="text-base font-bold text-slate-900">{item.hospitalName || "-"}</p>
                              <p className="text-xs font-semibold text-slate-500">{item.caseId || "-"}</p>
                            </div>
                            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)]">
                              <div className="min-w-0">
                                <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">送信日時</p>
                                <p className="mt-1 text-sm leading-6 text-slate-700">{sentAtLabel}</p>
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">選定科目</p>
                                <p className="mt-1 text-sm leading-6 text-slate-700">{item.selectedDepartments?.join(", ") || "-"}</p>
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">操作</p>
                                <div className="mt-1">
                                  <button
                                    type="button"
                                    disabled={!item.caseId}
                                    onClick={() => router.push(`/cases/${encodeURIComponent(item.caseId)}`)}
                                    className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.secondary} inline-flex items-center rounded-lg px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:text-slate-400`}
                                  >
                                    事案詳細
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                  {sendHistory.length === 0 ? (
                    <div className="ds-table-surface rounded-2xl px-4 py-8 text-sm text-slate-500">
                      送信履歴はまだありません。
                    </div>
                  ) : null}
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
      </div>
    </OfflineProvider>
  );
}



