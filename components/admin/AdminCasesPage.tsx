"use client";

import { useEffect, useMemo, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";

import { CaseSelectionHistoryTable } from "@/components/shared/CaseSelectionHistoryTable";
import { PatientSummaryPanel } from "@/components/shared/PatientSummaryPanel";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { formatCaseGenderLabel, getAdminCaseStatusTone } from "@/lib/casePresentation";
import type { CaseSelectionHistoryItem } from "@/lib/caseSelectionHistoryTypes";
import { formatAwareDateYmd } from "@/lib/dateTimeFormat";

type AdminCaseRow = {
  caseId: string;
  awareDate: string;
  awareTime: string;
  address: string;
  teamName: string;
  name: string;
  age: number | null;
  gender: string | null;
  status: "未読" | "選定中" | "搬送決定";
  destination: string;
};

type AdminCaseDetail = {
  caseId: string;
  patientSummary: Record<string, unknown> | null;
  selectionHistory: CaseSelectionHistoryItem[];
};

export function AdminCasesPage() {
  const [rows, setRows] = useState<AdminCaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);
  const [historyByCaseId, setHistoryByCaseId] = useState<Record<string, CaseSelectionHistoryItem[]>>({});
  const [historyLoadingByCaseId, setHistoryLoadingByCaseId] = useState<Record<string, boolean>>({});
  const [historyErrorByCaseId, setHistoryErrorByCaseId] = useState<Record<string, string>>({});
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminCaseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [activeTab, setActiveTab] = useState<"summary" | "history">("summary");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    void fetch("/api/admin/cases", { cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json()) as { rows?: AdminCaseRow[]; message?: string };
        if (!res.ok) throw new Error(data.message ?? "事案一覧の取得に失敗しました。");
        if (!active) return;
        setRows(Array.isArray(data.rows) ? data.rows : []);
      })
      .catch((fetchError) => {
        if (!active) return;
        setRows([]);
        setError(fetchError instanceof Error ? fetchError.message : "事案一覧の取得に失敗しました。");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
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

  return (
    <SettingPageLayout
      eyebrow="ADMIN CASES"
      title="事案一覧"
      description="全事案を一覧で閲覧し、患者サマリーと選定履歴を確認できます。管理者は閲覧のみ可能です。"
    >
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
        {error ? <p className="px-6 py-4 text-sm font-semibold text-rose-700">{error}</p> : null}
        <div className="overflow-x-auto">
          <table className="min-w-[1280px] w-full table-fixed text-sm" data-testid="admin-cases-table">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-4 py-3">事案ID</th>
                <th className="px-4 py-3">覚知日時</th>
                <th className="px-4 py-3">現場住所</th>
                <th className="px-4 py-3">出場隊名</th>
                <th className="px-4 py-3">氏名</th>
                <th className="px-4 py-3">年齢</th>
                <th className="px-4 py-3">性別</th>
                <th className="px-4 py-3">ステータス</th>
                <th className="px-4 py-3">搬送先</th>
                <th className="px-4 py-3 text-right">詳細</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-5 py-6 text-sm text-slate-500">
                    読み込み中...
                  </td>
                </tr>
              ) : null}
              {!loading &&
                rows.map((row) => {
                  const expanded = expandedCaseId === row.caseId;
                  const history = historyByCaseId[row.caseId] ?? [];
                  const historyLoading = Boolean(historyLoadingByCaseId[row.caseId]);
                  const historyError = historyErrorByCaseId[row.caseId] ?? "";

                  return (
                    <tr key={row.caseId}>
                      <td colSpan={10} className="p-0">
                        <table className="w-full table-fixed text-sm">
                          <tbody>
                            <tr
                              className="cursor-pointer border-t border-slate-100 transition hover:bg-amber-50/40"
                              data-testid="admin-case-row"
                              data-case-id={row.caseId}
                              onClick={() => toggleExpand(row.caseId)}
                            >
                              <td className="px-4 py-3 font-semibold text-slate-800">{row.caseId}</td>
                              <td className="px-4 py-3 text-slate-700">
                                {[formatAwareDateYmd(row.awareDate), row.awareTime].filter(Boolean).join(" ") || "-"}
                              </td>
                              <td className="px-4 py-3 text-slate-700">{row.address || "-"}</td>
                              <td className="px-4 py-3 text-slate-700">{row.teamName || "-"}</td>
                              <td className="px-4 py-3 text-slate-700">{row.name || "-"}</td>
                              <td className="px-4 py-3 text-slate-700">{row.age ?? "-"}</td>
                              <td className="px-4 py-3 text-slate-700">{formatCaseGenderLabel(row.gender)}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getAdminCaseStatusTone(row.status)}`}>
                                  {row.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-700">{row.destination || "-"}</td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  data-testid="admin-case-detail-button"
                                  data-case-id={row.caseId}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void openDetail(row.caseId);
                                  }}
                                  className="inline-flex items-center rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
                                >
                                  詳細
                                </button>
                              </td>
                            </tr>
                            <tr className="border-t border-slate-100">
                              <td colSpan={10} className="p-0">
                                <div
                                  className={`overflow-hidden transition-all duration-300 ease-out ${expanded ? "max-h-[480px] opacity-100" : "max-h-0 opacity-0"}`}
                                  data-testid="admin-case-history-panel"
                                  data-case-id={row.caseId}
                                  aria-hidden={!expanded}
                                >
                                  <div className="bg-slate-50 px-4 py-3">
                                    {historyLoading ? (
                                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                                        選定履歴を読み込み中...
                                      </div>
                                    ) : historyError ? (
                                      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                        {historyError}
                                      </div>
                                    ) : history.length === 0 ? (
                                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                                        選定履歴はまだありません。
                                      </div>
                                    ) : (
                                      <CaseSelectionHistoryTable
                                        rows={history}
                                        variant="compact"
                                        rowTestId="admin-case-history-row"
                                        rowCaseId={row.caseId}
                                      />
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  );
                })}
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-6 text-sm text-slate-500">
                    該当する事案はありません。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {selectedCaseId ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <div className="flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_-32px_rgba(15,23,42,0.45)]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">CASE DETAIL</p>
                <h2 className="mt-2 text-xl font-bold text-slate-900">{selectedCaseId}</h2>
                {selectedRow ? (
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedRow.teamName} / {[formatAwareDateYmd(selectedRow.awareDate), selectedRow.awareTime].filter(Boolean).join(" ") || "-"}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCaseId(null);
                  setDetail(null);
                  setDetailError("");
                  setDetailLoading(false);
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                aria-label="閉じる"
              >
                <XMarkIcon className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="border-b border-slate-200 px-6">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("summary")}
                  className={`border-b-2 px-3 py-3 text-sm font-semibold transition ${
                    activeTab === "summary" ? "border-amber-600 text-amber-700" : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  患者サマリー
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className={`border-b-2 px-3 py-3 text-sm font-semibold transition ${
                    activeTab === "history" ? "border-amber-600 text-amber-700" : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  選定履歴
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
              {detailLoading ? <p className="text-sm text-slate-500">読み込み中...</p> : null}
              {!detailLoading && detailError ? <p className="text-sm font-semibold text-rose-700">{detailError}</p> : null}
              {!detailLoading && !detailError && detail && activeTab === "summary" ? (
                <PatientSummaryPanel summary={detail.patientSummary} caseId={detail.caseId} />
              ) : null}
              {!detailLoading && !detailError && detail && activeTab === "history" ? (
                detail.selectionHistory.length > 0 ? (
                  <CaseSelectionHistoryTable rows={detail.selectionHistory} variant="detailed" showReplyBadge />
                ) : (
                  <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    選定履歴はまだありません。
                  </p>
                )
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </SettingPageLayout>
  );
}
