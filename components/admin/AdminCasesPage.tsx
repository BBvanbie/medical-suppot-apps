"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDownIcon, ChevronUpIcon, XMarkIcon } from "@heroicons/react/24/solid";

import {
  AdminWorkbenchMetric,
  AdminWorkbenchPage,
  AdminWorkbenchSection,
  adminActionButtonClass,
} from "@/components/admin/AdminWorkbench";
import { CaseSelectionHistoryTable } from "@/components/shared/CaseSelectionHistoryTable";
import { DetailMetadataGrid } from "@/components/shared/DetailMetadataGrid";
import { PatientSummaryPanel } from "@/components/shared/PatientSummaryPanel";
import { SplitWorkbenchLayout } from "@/components/shared/SplitWorkbenchLayout";
import { getAdminProblemMeta } from "@/lib/admin/adminProblemDrillDown";
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
  prefetchedHistory?: Record<string, CaseSelectionHistoryItem[]>;
  filterOptions?: {
    divisions?: string[];
    statuses?: AdminCaseStatus[];
  };
  message?: string;
};

function getCaseNextActionLabel(status: AdminCaseStatus) {
  if (status === "未読") return "患者サマリーを確認";
  if (status === "選定中") return "選定履歴と搬送先候補を確認";
  return "搬送決定後の履歴確認";
}

function getHistoryFocusLabel(statuses: string[]) {
  if (statuses.includes("NEGOTIATING")) return "要相談の停滞有無を確認";
  if (statuses.includes("READ")) return "既読後の未返信を確認";
  if (statuses.includes("ACCEPTABLE")) return "搬送決定待ちの経過を確認";
  if (statuses.includes("TRANSPORT_DECIDED")) return "搬送決定後の最終履歴を確認";
  return "送信履歴の流れを確認";
}

export function AdminCasesPage() {
  const searchParams = useSearchParams();
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
  const [detailByCaseId, setDetailByCaseId] = useState<Record<string, AdminCaseDetail>>({});
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminCaseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [activeTab, setActiveTab] = useState<"summary" | "history">("summary");
  const [contextNote, setContextNote] = useState("");
  const [contextLabels, setContextLabels] = useState<string[]>([]);
  const warmedCaseIdsRef = useRef<Record<string, boolean>>({});
  const inFlightDetailRequestsRef = useRef<Record<string, Promise<AdminCaseDetail | null>>>({});

  const fetchCaseDetail = useCallback(async (caseId: string, options?: { background?: boolean }) => {
    const existingRequest = inFlightDetailRequestsRef.current[caseId];
    if (existingRequest) {
      const nextDetail = await existingRequest;
      if (!options?.background) {
        setSelectedCaseId(caseId);
        setActiveTab("summary");
        setDetailError("");
        setDetailLoading(false);
        setDetail(nextDetail);
      }
      return nextDetail;
    }

    if (!options?.background) {
      setSelectedCaseId(caseId);
      setActiveTab("summary");
      setDetail(null);
      setDetailError("");
      setDetailLoading(true);
    }

    const request = (async () => {
      const res = await fetch(`/api/admin/cases/${encodeURIComponent(caseId)}`, { cache: "no-store" });
      const data = (await res.json()) as AdminCaseDetail & { message?: string };
      if (!res.ok) throw new Error(data.message ?? "事案詳細の取得に失敗しました。");

      const nextDetail = {
        caseId: data.caseId,
        patientSummary: data.patientSummary ?? null,
        selectionHistory: Array.isArray(data.selectionHistory) ? data.selectionHistory : [],
      } satisfies AdminCaseDetail;

      setDetailByCaseId((prev) => ({ ...prev, [caseId]: nextDetail }));
      setHistoryByCaseId((prev) => ({ ...prev, [caseId]: nextDetail.selectionHistory }));
      setHistoryErrorByCaseId((prev) => ({ ...prev, [caseId]: "" }));

      if (!options?.background) {
        setDetail(nextDetail);
      }

      return nextDetail;
    })();
    inFlightDetailRequestsRef.current[caseId] = request;

    try {
      const nextDetail = await request;
      return nextDetail;
    } catch (fetchError) {
      if (!options?.background) {
        setDetailError(fetchError instanceof Error ? fetchError.message : "事案詳細の取得に失敗しました。");
      }
      return null;
    } finally {
      delete inFlightDetailRequestsRef.current[caseId];
      if (!options?.background) {
        setDetailLoading(false);
      }
    }
  }, []);

  const fetchRows = useCallback(async (filters?: { teamName?: string; division?: string; status?: string; area?: string; hospitalName?: string; problem?: string }) => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      const nextTeamName = filters?.teamName ?? teamNameFilter;
      const nextDivision = filters?.division ?? divisionFilter;
      const nextStatus = filters?.status ?? statusFilter;
      const nextArea = filters?.area ?? searchParams.get("area") ?? "";
      const nextHospitalName = filters?.hospitalName ?? searchParams.get("hospitalName") ?? "";
      const nextProblem = filters?.problem ?? searchParams.get("problem") ?? "";

      if (nextTeamName.trim()) params.set("teamName", nextTeamName.trim());
      if (nextDivision) params.set("division", nextDivision);
      if (nextStatus) params.set("status", nextStatus);
      if (nextArea.trim()) params.set("area", nextArea.trim());
      if (nextHospitalName.trim()) params.set("hospitalName", nextHospitalName.trim());
      if (nextProblem.trim()) params.set("problem", nextProblem.trim());

      const query = params.toString();
      const res = await fetch(`/api/admin/cases${query ? `?${query}` : ""}`, { cache: "no-store" });
      const data = (await res.json()) as AdminCasesResponse;
      if (!res.ok) throw new Error(data.message ?? "事案一覧の取得に失敗しました。");

      const nextRows = Array.isArray(data.rows) ? data.rows : [];
      setRows(nextRows);
      setHistoryByCaseId((prev) => ({ ...prev, ...(data.prefetchedHistory ?? {}) }));
      setDivisionOptions(Array.isArray(data.filterOptions?.divisions) ? data.filterOptions?.divisions : []);
      setStatusOptions(
        Array.isArray(data.filterOptions?.statuses) ? data.filterOptions?.statuses : ["未読", "選定中", "搬送決定"],
      );
      const labels = [
        nextProblem === "selection_stalled" ? "選定停滞" : "",
        nextProblem === "consult_stalled" ? "要相談停滞" : "",
        nextProblem === "reply_delay" ? "返信遅延" : "",
        nextHospitalName ? `病院: ${nextHospitalName}` : "",
        nextArea ? `地域: ${nextArea}` : "",
      ].filter(Boolean);
      setContextLabels(labels);
      setContextNote(labels.join(" / "));

      void (async () => {
        for (const row of nextRows.slice(0, 2)) {
          if (warmedCaseIdsRef.current[row.caseId]) continue;
          warmedCaseIdsRef.current[row.caseId] = true;
          await fetchCaseDetail(row.caseId, { background: true });
        }
      })();
    } catch (fetchError) {
      setRows([]);
      setError(fetchError instanceof Error ? fetchError.message : "事案一覧の取得に失敗しました。");
      setContextNote("");
      setContextLabels([]);
    } finally {
      setLoading(false);
    }
  }, [divisionFilter, fetchCaseDetail, searchParams, statusFilter, teamNameFilter]);

  useEffect(() => {
    void fetchRows({
      teamName: searchParams.get("teamName") ?? "",
      division: searchParams.get("division") ?? "",
      status: searchParams.get("status") ?? "",
      area: searchParams.get("area") ?? "",
      hospitalName: searchParams.get("hospitalName") ?? "",
      problem: searchParams.get("problem") ?? "",
    });
  }, [fetchRows, searchParams]);

  const fetchSelectionHistory = async (caseId: string) => {
    if (historyLoadingByCaseId[caseId]) return;
    if (detailByCaseId[caseId]) {
      setHistoryByCaseId((prev) => ({ ...prev, [caseId]: detailByCaseId[caseId].selectionHistory }));
      setHistoryErrorByCaseId((prev) => ({ ...prev, [caseId]: "" }));
      return;
    }

    setHistoryLoadingByCaseId((prev) => ({ ...prev, [caseId]: true }));
    setHistoryErrorByCaseId((prev) => ({ ...prev, [caseId]: "" }));

    try {
      const nextDetail = await fetchCaseDetail(caseId, { background: true });
      if (!nextDetail) throw new Error("選定履歴の取得に失敗しました。");
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
    const cachedDetail = detailByCaseId[caseId];
    if (cachedDetail) {
      setSelectedCaseId(caseId);
      setActiveTab("summary");
      setDetailError("");
      setDetail(cachedDetail);
      setHistoryByCaseId((prev) => ({ ...prev, [caseId]: cachedDetail.selectionHistory }));
      return;
    }
    await fetchCaseDetail(caseId);
  };

  const selectedRow = useMemo(
    () => rows.find((row) => row.caseId === selectedCaseId) ?? null,
    [rows, selectedCaseId],
  );
  const activeProblem = getAdminProblemMeta(searchParams.get("problem"));
  const undecidedCount = rows.filter((row) => row.status !== "搬送決定").length;
  const decidedCount = rows.filter((row) => row.status === "搬送決定").length;
  const unreadCount = rows.filter((row) => row.status === "未読").length;
  const divisionCount = new Set(rows.map((row) => row.division).filter(Boolean)).size;
  const historyStatuses = detail?.selectionHistory.map((item) => item.status) ?? [];
  const waitingReplyCount = detail?.selectionHistory.filter((item) => item.status === "NEGOTIATING" && item.lastActor === "HP").length ?? 0;
  const acceptableCount = detail?.selectionHistory.filter((item) => item.status === "ACCEPTABLE").length ?? 0;
  const historyFocusLabel = getHistoryFocusLabel(historyStatuses);

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
              window.setTimeout(() => void fetchRows({ teamName: "", division: "", status: "", area: "", hospitalName: "", problem: "" }), 0);
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
      <SplitWorkbenchLayout
        primary={
          <>
            <AdminWorkbenchSection
              kicker="CASE FILTERS"
              title="監視条件"
              description="隊名、方面、状態で絞り込みながら全体件数と案件の偏りを把握します。"
            >
              <div className="grid gap-3 ds-grid-md-case-filter">
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
                  <button
                    type="button"
                    onClick={() => void fetchRows()}
                    disabled={loading}
                    className={`${adminActionButtonClass("primary")} w-full`}
                  >
                    {loading ? "検索中..." : "検索"}
                  </button>
                </div>
              </div>
              {contextNote ? (
                <div className="mt-3 space-y-2" data-testid="admin-case-context-note">
                  <p className="text-sm font-medium text-orange-700">drill-down 条件: {contextNote}</p>
                  <div className="flex flex-wrap gap-2">
                    {contextLabels.map((label) => (
                      <span key={label} className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
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
                        className="ds-panel-surface ds-radius-panel px-4 py-4 transition hover:border-orange-200 hover:bg-orange-50/40"
                        data-testid="admin-case-row"
                        data-case-id={row.caseId}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="ds-text-md font-bold text-slate-950">{row.caseId}</p>
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
                            <p className="mt-1 ds-text-xs-plus text-slate-500">
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

                        <div className="mt-4">
                          <DetailMetadataGrid
                            items={[
                              { label: "患者", value: row.name || "-" },
                              { label: "年齢 / 性別", value: `${row.age ?? "-"} / ${formatCaseGenderLabel(row.gender)}` },
                              { label: "現場住所", value: row.address || "-" },
                              { label: "方面", value: row.division || "-" },
                              { label: "隊名", value: row.teamName || "-" },
                            ]}
                          />
                        </div>

                        <div
                          className={`overflow-hidden ds-transition-expand duration-300 ease-out ${expanded ? "mt-4 ds-max-h-admin-row opacity-100" : "max-h-0 opacity-0"}`}
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
          </>
        }
        secondary={
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
              <div className="ds-muted-panel ds-radius-panel px-4 py-5 text-sm leading-6 text-slate-500">
                右側の detail workbench では、患者サマリーと選定履歴を切り替えて確認できます。
              </div>
            ) : (
              <>
                {selectedRow ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="ds-radius-command bg-orange-50/70 px-4 py-4">
                      <p className="ds-text-2xs font-semibold ds-track-eyebrow text-orange-700">DRILL-DOWN CONTEXT</p>
                      <p className="mt-2 text-base font-bold text-slate-950">{contextNote || "一覧から詳細を選択"}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">{selectedRow.teamName} / {selectedRow.division || "-"}</p>
                    </div>
                    <div className="ds-radius-command bg-slate-50/90 px-4 py-4">
                      <p className="ds-text-2xs font-semibold ds-track-eyebrow text-slate-500">NEXT ACTION</p>
                      <p className="mt-2 text-base font-bold text-slate-950">{activeProblem?.nextAction ?? getCaseNextActionLabel(selectedRow.status)}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">患者サマリーと選定履歴を切り替えながら確認します。</p>
                    </div>
                  </div>
                ) : null}

                {selectedRow ? (
                  <div className="mt-3 ds-radius-command border border-slate-200/80 bg-slate-50/70 px-4 py-4">
                    <p className="ds-text-2xs font-semibold ds-track-eyebrow text-slate-500">DETAIL CHECKPOINTS</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-500">状態</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{selectedRow.status}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500">搬送先</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{selectedRow.destination || "未決定"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500">監視の見どころ</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{activeProblem?.label ?? "患者サマリー確認"}</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {selectedRow && detail && activeTab === "history" ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-3" data-testid="admin-case-history-summary">
                    <div className="ds-radius-command bg-slate-50/90 px-4 py-4">
                      <p className="ds-text-2xs font-semibold ds-track-eyebrow text-slate-500">HISTORY FOCUS</p>
                      <p className="mt-2 text-sm font-bold text-slate-900">{historyFocusLabel}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">履歴タブで最初に拾う観点です。</p>
                    </div>
                    <div className="ds-radius-command bg-rose-50/70 px-4 py-4">
                      <p className="ds-text-2xs font-semibold ds-track-eyebrow text-rose-700">WAITING REPLY</p>
                      <p className="mt-2 text-lg font-bold text-slate-900">{waitingReplyCount}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">HP コメント後に返信待ちの送信先</p>
                    </div>
                    <div className="ds-radius-command bg-emerald-50/70 px-4 py-4">
                      <p className="ds-text-2xs font-semibold ds-track-eyebrow text-emerald-700">ACCEPTABLE</p>
                      <p className="mt-2 text-lg font-bold text-slate-900">{acceptableCount}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">受入可能まで進んだ候補数</p>
                    </div>
                  </div>
                ) : null}

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

                <div className="mt-4 ds-max-h-admin-workspace overflow-auto pr-1">
                  {detailLoading ? <p className="text-sm text-slate-500">読み込み中...</p> : null}
                  {!detailLoading && detailError ? <p className="text-sm font-semibold text-rose-700">{detailError}</p> : null}
                  {!detailLoading && !detailError && detail && activeTab === "summary" ? (
                    <PatientSummaryPanel
                      summary={detail.patientSummary}
                      caseId={detail.caseId}
                      className="ds-radius-panel bg-white px-0 py-0 shadow-none"
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
        }
      />
    </AdminWorkbenchPage>
  );
}
