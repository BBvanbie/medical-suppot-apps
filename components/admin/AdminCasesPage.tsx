"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDownIcon, ChevronUpIcon, XMarkIcon } from "@heroicons/react/24/solid";

import {
  AdminWorkbenchMetric,
  AdminWorkbenchPage,
  AdminWorkbenchSection,
  adminActionButtonClass,
} from "@/components/admin/AdminWorkbench";
import { CaseSelectionHistoryTable } from "@/components/shared/CaseSelectionHistoryTable";
import { PatientSummaryPanel } from "@/components/shared/PatientSummaryPanel";
import { formatCaseGenderLabel, getAdminCaseStatusTone } from "@/lib/casePresentation";
import type { CaseSelectionHistoryItem } from "@/lib/caseSelectionHistoryTypes";
import { formatAwareDateYmd } from "@/lib/dateTimeFormat";

type AdminCaseStatus = "未読" | "選定中" | "搬送決定";

type AdminCaseRow = {
  caseId: string;
  division: string;
  awareDate: string;
  awareTime: string;
  address: string;
  teamName: string;
  name: string;
  age: number | null;
  gender: string | null;
  status: AdminCaseStatus;
  destination: string;
};

type AdminCaseDetail = {
  caseId: string;
  patientSummary: Record<string, unknown> | null;
  selectionHistory: CaseSelectionHistoryItem[];
};

type AdminCasesResponse = {
  rows?: AdminCaseRow[];
  filterOptions?: {
    divisions?: string[];
    statuses?: AdminCaseStatus[];
  };
  message?: string;
};

function CaseMetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="ds-muted-panel rounded-2xl px-3 py-3">
      <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-[12px] font-semibold leading-5 text-slate-800">{value}</p>
    </div>
  );
}

export function AdminCasesPage() {
  const [rows, setRows] = useState<AdminCaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [teamNameFilter, setTeamNameFilter] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [divisionOptions, setDivisionOptions] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<AdminCaseStatus[]>(["未読", "選定中", "搬送決定"]);
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);
  const [historyByCaseId, setHistoryByCaseId] = useState<Record<string, CaseSelectionHistoryItem[]>>({});
  const [historyLoadingByCaseId, setHistoryLoadingByCaseId] = useState<Record<string, boolean>>({});
  const [historyErrorByCaseId, setHistoryErrorByCaseId] = useState<Record<string, string>>({});
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminCaseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [activeTab, setActiveTab] = useState<"summary" | "history">("summary");

  const fetchRows = async (filters?: { teamName?: string; division?: string; status?: string }) => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      const nextTeamName = filters?.teamName ?? teamNameFilter;
      const nextDivision = filters?.division ?? divisionFilter;
      const nextStatus = filters?.status ?? statusFilter;

      if (nextTeamName.trim()) params.set("teamName", nextTeamName.trim());
      if (nextDivision) params.set("division", nextDivision);
      if (nextStatus) params.set("status", nextStatus);

      const query = params.toString();
      const res = await fetch(`/api/admin/cases${query ? `?${query}` : ""}`, { cache: "no-store" });
      const data = (await res.json()) as AdminCasesResponse;
      if (!res.ok) throw new Error(data.message ?? "事案一覧の取得に失敗しました。");

      setRows(Array.isArray(data.rows) ? data.rows : []);
      setDivisionOptions(Array.isArray(data.filterOptions?.divisions) ? data.filterOptions?.divisions : []);
      setStatusOptions(
        Array.isArray(data.filterOptions?.statuses) ? data.filterOptions?.statuses : ["未読", "選定中", "搬送決定"],
      );
    } catch (fetchError) {
      setRows([]);
      setError(fetchError instanceof Error ? fetchError.message : "事案一覧の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRows({ teamName: "", division: "", status: "" });
    // Initial load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSelectionHistory = async (caseId: string) => {
    if (historyLoadingByCaseId[caseId]) return;

    setHistoryLoadingByCaseId((prev) => ({ ...prev, [caseId]: true }));
    setHistoryErrorByCaseId((prev) => ({ ...prev, [caseId]: "" }));

    try {
      const res = await fetch(`/api/admin/cases/${encodeURIComponent(caseId)}`, { cache: "no-store" });
      const data = (await res.json()) as AdminCaseDetail & { message?: string };
      if (!res.ok) throw new Error(data.message ?? "選定履歴の取得に失敗しました。");
      setHistoryByCaseId((prev) => ({
        ...prev,
        [caseId]: Array.isArray(data.selectionHistory) ? data.selectionHistory : [],
      }));
    } catch (fetchError) {
      setHistoryErrorByCaseId((prev) => ({
        ...prev,
        [caseId]: fetchError instanceof Error ? fetchError.message : "選定履歴の取得に失敗しました。",
      }));
    } finally {
      setHistoryLoadingByCaseId((prev) => ({ ...prev, [caseId]: false }));
    }
  };

  const toggleExpand = (caseId: string) => {
    if (expandedCaseId === caseId) {
      setExpandedCaseId(null);
      return;
    }

    setExpandedCaseId(caseId);
    if (historyByCaseId[caseId] || historyErrorByCaseId[caseId]) return;
    void fetchSelectionHistory(caseId);
  };

  const openDetail = async (caseId: string) => {
    setSelectedCaseId(caseId);
    setActiveTab("summary");
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);

    try {
      const res = await fetch(`/api/admin/cases/${encodeURIComponent(caseId)}`, { cache: "no-store" });
      const data = (await res.json()) as AdminCaseDetail & { message?: string };
      if (!res.ok) throw new Error(data.message ?? "事案詳細の取得に失敗しました。");
      setDetail({
        caseId: data.caseId,
        patientSummary: data.patientSummary ?? null,
        selectionHistory: Array.isArray(data.selectionHistory) ? data.selectionHistory : [],
      });
    } catch (fetchError) {
      setDetailError(fetchError instanceof Error ? fetchError.message : "事案詳細の取得に失敗しました。");
    } finally {
      setDetailLoading(false);
    }
  };

  const selectedRow = useMemo(
    () => rows.find((row) => row.caseId === selectedCaseId) ?? null,
    [rows, selectedCaseId],
  );
  const undecidedCount = rows.filter((row) => row.status !== "搬送決定").length;
  const decidedCount = rows.filter((row) => row.status === "搬送決定").length;
  const unreadCount = rows.filter((row) => row.status === "未読").length;
  const divisionCount = new Set(rows.map((row) => row.division).filter(Boolean)).size;

  return (
    <AdminWorkbenchPage
      eyebrow="ADMIN CASE WORKBENCH"
      title="事案一覧"
      description="全事案を同じ視線上で比較し、対象案件の患者サマリーと選定履歴をすぐ確認できる管理画面です。"
      action={
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void fetchRows()} disabled={loading} className={adminActionButtonClass("primary")}>
            {loading ? "更新中..." : "一覧を更新"}
          </button>
          <button
            type="button"
            onClick={() => {
              setTeamNameFilter("");
              setDivisionFilter("");
              setStatusFilter("");
              window.setTimeout(() => void fetchRows({ teamName: "", division: "", status: "" }), 0);
            }}
            className={adminActionButtonClass("secondary")}
          >
            フィルタ解除
          </button>
        </div>
      }
      metrics={
        <>
          <AdminWorkbenchMetric label="TOTAL CASES" value={rows.length} hint="現在の表示件数" tone="accent" />
          <AdminWorkbenchMetric label="SELECTION ACTIVE" value={undecidedCount} hint="選定継続中の件数" />
          <AdminWorkbenchMetric label="UNREAD" value={unreadCount} hint="未読事案の件数" tone="warning" />
          <AdminWorkbenchMetric label="DIVISIONS" value={divisionCount} hint={`${decidedCount}件が搬送決定`} />
        </>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.92fr)]">
        <div className="min-w-0 space-y-5">
          <AdminWorkbenchSection
            kicker="CASE FILTERS"
            title="監視条件"
            description="隊名、方面、状態で絞り込みながら全体件数と案件の偏りを把握します。"
          >
            <div className="grid gap-3 md:grid-cols-[minmax(0,1.1fr)_180px_180px_auto]">
              <label className="block">
                <span className="ds-field-label">隊名</span>
                <input
                  value={teamNameFilter}
                  onChange={(event) => setTeamNameFilter(event.target.value)}
                  placeholder="救急隊名で検索"
                  className="ds-field"
                />
              </label>
              <label className="block">
                <span className="ds-field-label">方面</span>
                <select
                  value={divisionFilter}
                  onChange={(event) => setDivisionFilter(event.target.value)}
                  className="ds-field"
                >
                  <option value="">すべて</option>
                  {divisionOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="ds-field-label">状態</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="ds-field"
                >
                  <option value="">すべて</option>
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end">
                <button type="button" onClick={() => void fetchRows()} disabled={loading} className={`${adminActionButtonClass("primary")} w-full`}>
                  {loading ? "検索中..." : "検索"}
                </button>
              </div>
            </div>
            {error ? <p className="mt-3 text-sm font-semibold text-rose-700">{error}</p> : null}
          </AdminWorkbenchSection>

          <AdminWorkbenchSection
            kicker="CASE MONITOR"
            title="対象事案"
            description="行単位で状況を比較し、履歴をその場で確認できます。"
          >
            <div className="space-y-3" data-testid="admin-cases-table">
              {loading ? <p className="ds-muted-panel px-4 py-4 text-sm text-slate-500">読み込み中...</p> : null}
              {!loading && rows.length === 0 ? (
                <p className="ds-muted-panel px-4 py-4 text-sm text-slate-500">該当する事案はありません。</p>
              ) : null}
              {!loading &&
                rows.map((row) => {
                  const expanded = expandedCaseId === row.caseId;
                  const history = historyByCaseId[row.caseId] ?? [];
                  const historyLoading = Boolean(historyLoadingByCaseId[row.caseId]);
                  const historyError = historyErrorByCaseId[row.caseId] ?? "";

                  return (
                    <article
                      key={row.caseId}
                      className="ds-panel-surface rounded-[24px] px-4 py-4 transition hover:border-orange-200 hover:bg-orange-50/40"
                      data-testid="admin-case-row"
                      data-case-id={row.caseId}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[15px] font-bold text-slate-950">{row.caseId}</p>
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getAdminCaseStatusTone(
                                row.status,
                              )}`}
                            >
                              {row.status}
                            </span>
                            {row.destination ? (
                              <span className="inline-flex rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
                                搬送先 {row.destination}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-[12px] text-slate-500">
                            {[formatAwareDateYmd(row.awareDate), row.awareTime].filter(Boolean).join(" ") || "-"} /{" "}
                            {row.teamName || "-"} / {row.division || "-"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => toggleExpand(row.caseId)}
                            className={adminActionButtonClass("ghost")}
                          >
                            {expanded ? (
                              <>
                                <ChevronUpIcon className="mr-1 h-4 w-4" aria-hidden />
                                履歴を閉じる
                              </>
                            ) : (
                              <>
                                <ChevronDownIcon className="mr-1 h-4 w-4" aria-hidden />
                                履歴を見る
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            data-testid="admin-case-detail-button"
                            data-case-id={row.caseId}
                            onClick={() => void openDetail(row.caseId)}
                            className={adminActionButtonClass(selectedCaseId === row.caseId ? "primary" : "secondary")}
                          >
                            {selectedCaseId === row.caseId ? "詳細表示中" : "詳細を開く"}
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 lg:grid-cols-5">
                        <CaseMetaItem label="患者" value={row.name || "-"} />
                        <CaseMetaItem label="年齢 / 性別" value={`${row.age ?? "-"} / ${formatCaseGenderLabel(row.gender)}`} />
                        <CaseMetaItem label="現場住所" value={row.address || "-"} />
                        <CaseMetaItem label="方面" value={row.division || "-"} />
                        <CaseMetaItem label="隊名" value={row.teamName || "-"} />
                      </div>

                      <div
                        className={`overflow-hidden transition-all duration-300 ease-out ${expanded ? "mt-4 max-h-[520px] opacity-100" : "max-h-0 opacity-0"}`}
                        data-testid="admin-case-history-panel"
                        data-case-id={row.caseId}
                        aria-hidden={!expanded}
                      >
                        {historyLoading ? (
                          <div className="ds-muted-panel px-4 py-4 text-sm text-slate-500">選定履歴を読み込み中...</div>
                        ) : historyError ? (
                          <div className="rounded-2xl bg-rose-50 px-4 py-4 text-sm text-rose-700">{historyError}</div>
                        ) : history.length === 0 ? (
                          <div className="ds-muted-panel px-4 py-4 text-sm text-slate-500">選定履歴はまだありません。</div>
                        ) : (
                          <CaseSelectionHistoryTable
                            rows={history}
                            variant="compact"
                            rowTestId="admin-case-history-row"
                            rowCaseId={row.caseId}
                          />
                        )}
                      </div>
                    </article>
                  );
                })}
            </div>
          </AdminWorkbenchSection>
        </div>

        <AdminWorkbenchSection
          kicker="CASE DETAIL"
          title={selectedCaseId ?? "事案詳細"}
          description={
            selectedRow
              ? `${selectedRow.teamName} / ${[formatAwareDateYmd(selectedRow.awareDate), selectedRow.awareTime]
                  .filter(Boolean)
                  .join(" ") || "-"}`
              : "一覧から対象事案を選ぶと患者サマリーと選定履歴を確認できます。"
          }
          className="self-start xl:sticky xl:top-5"
          action={
            selectedCaseId ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedCaseId(null);
                  setDetail(null);
                  setDetailError("");
                  setDetailLoading(false);
                }}
                className="ds-button ds-button--secondary inline-flex h-10 w-10 items-center justify-center rounded-2xl px-0 text-slate-600 hover:border-orange-200 hover:text-orange-700"
                aria-label="詳細を閉じる"
              >
                <XMarkIcon className="h-5 w-5" aria-hidden />
              </button>
            ) : null
          }
        >
          {!selectedCaseId ? (
            <div className="ds-muted-panel rounded-[24px] px-4 py-5 text-sm leading-6 text-slate-500">
              右側の detail workbench では、患者サマリーと選定履歴を切り替えて確認できます。
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("summary")}
                  className={`${activeTab === "summary" ? adminActionButtonClass("primary") : adminActionButtonClass("secondary")} flex-1`}
                >
                  患者サマリー
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className={`${activeTab === "history" ? adminActionButtonClass("primary") : adminActionButtonClass("secondary")} flex-1`}
                >
                  選定履歴
                </button>
              </div>

              <div className="mt-4 max-h-[calc(100vh-16rem)] overflow-auto pr-1">
                {detailLoading ? <p className="text-sm text-slate-500">読み込み中...</p> : null}
                {!detailLoading && detailError ? <p className="text-sm font-semibold text-rose-700">{detailError}</p> : null}
                {!detailLoading && !detailError && detail && activeTab === "summary" ? (
                  <PatientSummaryPanel
                    summary={detail.patientSummary}
                    caseId={detail.caseId}
                    className="rounded-[24px] bg-white px-0 py-0 shadow-none"
                  />
                ) : null}
                {!detailLoading && !detailError && detail && activeTab === "history" ? (
                  detail.selectionHistory.length > 0 ? (
                    <CaseSelectionHistoryTable rows={detail.selectionHistory} variant="detailed" showReplyBadge />
                  ) : (
                    <p className="ds-muted-panel px-4 py-4 text-sm text-slate-500">選定履歴はまだありません。</p>
                  )
                ) : null}
              </div>
            </>
          )}
        </AdminWorkbenchSection>
      </div>
    </AdminWorkbenchPage>
  );
}
