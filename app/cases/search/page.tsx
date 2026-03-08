"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Sidebar } from "@/components/home/Sidebar";
import { ConsultChatModal } from "@/components/shared/ConsultChatModal";
import { RequestStatusBadge } from "@/components/shared/RequestStatusBadge";
import { formatAwareDateYmd, formatDateTimeMdHm } from "@/lib/dateTimeFormat";

type RequestStatus =
  | "UNREAD"
  | "READ"
  | "NEGOTIATING"
  | "ACCEPTABLE"
  | "NOT_ACCEPTABLE"
  | "TRANSPORT_DECIDED"
  | "TRANSPORT_DECLINED";

type CaseRequestTarget = {
  targetId: number;
  requestId: string;
  sentAt: string;
  hospitalName: string;
  status: RequestStatus;
  updatedAt: string;
  lastActor: "A" | "HP" | null;
  selectedDepartments: string[];
  latestHpComment: string | null;
  latestAReply: string | null;
};

type CaseSearchRow = {
  caseId: string;
  division: string;
  awareDate: string;
  awareTime: string;
  address: string;
  name: string;
  age: number;
  gender?: string | null;
  destination?: string | null;
  incidentStatus: string;
  requestTargetCount: number;
};

type CaseSearchResponse = {
  rows: CaseSearchRow[];
  message?: string;
};

type CaseTargetsResponse = {
  caseId: string;
  targets: CaseRequestTarget[];
  message?: string;
};

type ConsultMessage = {
  id: number;
  actor: "A" | "HP";
  actedAt: string;
  note: string;
};

type NotificationSummaryResponse = {
  items?: Array<{
    kind?: string;
    caseId?: string | null;
    isRead?: boolean;
  }>;
};

const DIVISION_OPTIONS = ["", "1隊", "2隊", "3隊"];

function toTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getTargetPriority(target: CaseRequestTarget): number {
  if (target.status === "TRANSPORT_DECIDED") return 1;
  if (target.status === "ACCEPTABLE") return 2;
  if (target.status === "NEGOTIATING") return 3;
  if (target.status === "NOT_ACCEPTABLE") return 4;
  if (target.status === "TRANSPORT_DECLINED") return 5;
  if (target.status === "READ") return 6;
  return 7;
}

function formatGenderLabel(value: string | null | undefined): string {
  if (value === "male") return "男性";
  if (value === "female") return "女性";
  if (value === "unknown") return "不明";
  return "-";
}

export default function CaseSearchPage() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [q, setQ] = useState("");
  const [division, setDivision] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<CaseSearchRow[]>([]);
  const [expandedCaseIds, setExpandedCaseIds] = useState<Record<string, boolean>>({});
  const [notifiedCaseIds, setNotifiedCaseIds] = useState<Record<string, boolean>>({});
  const [targetsByCaseId, setTargetsByCaseId] = useState<Record<string, CaseRequestTarget[]>>({});
  const [targetsLoadingByCaseId, setTargetsLoadingByCaseId] = useState<Record<string, boolean>>({});
  const [targetsErrorByCaseId, setTargetsErrorByCaseId] = useState<Record<string, string>>({});
  const expandTimingsRef = useRef<Record<string, number>>({});

  const [chatTarget, setChatTarget] = useState<CaseRequestTarget | null>(null);
  const [chatCaseId, setChatCaseId] = useState("");
  const [chatMessages, setChatMessages] = useState<ConsultMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [chatNote, setChatNote] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatStatus, setChatStatus] = useState<RequestStatus | null>(null);
  const [chatDecisionConfirm, setChatDecisionConfirm] = useState<"TRANSPORT_DECIDED" | "TRANSPORT_DECLINED" | null>(null);
  const [rowDecisionConfirm, setRowDecisionConfirm] = useState<{
    caseId: string;
    targetId: number;
    hospitalName: string;
    nextStatus: "TRANSPORT_DECIDED" | "TRANSPORT_DECLINED";
  } | null>(null);
  const [rowDecisionSending, setRowDecisionSending] = useState(false);

  const hasFilter = useMemo(() => q.trim().length > 0 || division !== "", [q, division]);
  const showFilters = pathname === "/cases/search";

  const fetchCases = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (division) params.set("division", division);
      params.set("limit", "200");

      const res = await fetch(`/api/cases/search?${params.toString()}`, { cache: "no-store" });
      const data = (await res.json()) as CaseSearchResponse;
      if (!res.ok) throw new Error(data.message ?? "事案一覧の取得に失敗しました。");
      setRows(Array.isArray(data.rows) ? data.rows : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "事案一覧の取得に失敗しました。");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCaseTargets = async (caseId: string) => {
    if (targetsLoadingByCaseId[caseId]) return;
    const start = performance.now();
    setTargetsLoadingByCaseId((prev) => ({ ...prev, [caseId]: true }));
    setTargetsErrorByCaseId((prev) => ({ ...prev, [caseId]: "" }));

    try {
      const res = await fetch(`/api/cases/search/${encodeURIComponent(caseId)}`, { cache: "no-store" });
      const data = (await res.json()) as CaseTargetsResponse;
      if (!res.ok) throw new Error(data.message ?? "選定病院一覧の取得に失敗しました。");

      const targets = Array.isArray(data.targets) ? data.targets : [];
      setTargetsByCaseId((prev) => ({ ...prev, [caseId]: targets }));

      const fetchMs = performance.now() - start;
      requestAnimationFrame(() => {
        const totalMs = performance.now() - (expandTimingsRef.current[caseId] ?? start);
        console.info("[case-expand]", { caseId, targets: targets.length, fetchMs: Math.round(fetchMs), totalMs: Math.round(totalMs), source: "network" });
      });
    } catch (e) {
      setTargetsErrorByCaseId((prev) => ({ ...prev, [caseId]: e instanceof Error ? e.message : "選定病院一覧の取得に失敗しました。" }));
    } finally {
      setTargetsLoadingByCaseId((prev) => ({ ...prev, [caseId]: false }));
    }
  };

  const fetchCaseNotifications = async () => {
    try {
      const res = await fetch("/api/notifications?limit=100", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as NotificationSummaryResponse;
      const next: Record<string, boolean> = {};
      for (const item of data.items ?? []) {
        const caseId = item.caseId ?? null;
        const kind = item.kind ?? "";
        const isRead = Boolean(item.isRead);
        if (!isRead && caseId && (kind === "hospital_status_changed" || kind === "consult_status_changed")) next[caseId] = true;
      }
      setNotifiedCaseIds(next);
    } catch {
      // noop
    }
  };

  useEffect(() => {
    void fetchCases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void fetchCaseNotifications();
    const timer = window.setInterval(() => void fetchCaseNotifications(), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const sortedTargetsByCaseId = useMemo(() => {
    const next: Record<string, CaseRequestTarget[]> = {};
    for (const [caseId, targets] of Object.entries(targetsByCaseId)) {
      next[caseId] = [...targets].sort((a, b) => {
        const priorityDiff = getTargetPriority(a) - getTargetPriority(b);
        if (priorityDiff !== 0) return priorityDiff;
        const aTime = toTimestamp(a.updatedAt || a.sentAt);
        const bTime = toTimestamp(b.updatedAt || b.sentAt);
        return aTime - bTime;
      });
    }
    return next;
  }, [targetsByCaseId]);

  const toggleExpand = (caseId: string) => {
    const willExpand = !expandedCaseIds[caseId];
    setExpandedCaseIds((prev) => ({ ...prev, [caseId]: willExpand }));
    if (!willExpand) return;

    expandTimingsRef.current[caseId] = performance.now();
    const cachedTargets = targetsByCaseId[caseId];
    const row = rows.find((item) => item.caseId === caseId);
    const hasUsableCache =
      Array.isArray(cachedTargets) &&
      (cachedTargets.length > 0 || (row?.requestTargetCount ?? 0) === 0);

    if (hasUsableCache) {
      requestAnimationFrame(() => {
        const totalMs = performance.now() - expandTimingsRef.current[caseId];
        console.info("[case-expand]", { caseId, targets: targetsByCaseId[caseId].length, fetchMs: 0, totalMs: Math.round(totalMs), source: "cache" });
      });
      return;
    }
    void fetchCaseTargets(caseId);
  };

  const openConsult = async (caseId: string, target: CaseRequestTarget) => {
    setChatCaseId(caseId);
    setChatTarget(target);
    setChatMessages([]);
    setChatNote("");
    setChatError("");
    setChatLoading(true);
    setChatStatus(target.status);
    try {
      const res = await fetch(`/api/cases/consults/${target.targetId}`);
      const data = (await res.json()) as { status?: RequestStatus; messages?: ConsultMessage[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "相談履歴の取得に失敗しました。");
      setChatStatus(data.status ?? target.status);
      setChatMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "相談履歴の取得に失敗しました。");
      setChatMessages([]);
    } finally {
      setChatLoading(false);
    }
  };

  const closeConsult = () => {
    if (chatSending) return;
    setChatTarget(null);
    setChatCaseId("");
    setChatMessages([]);
    setChatError("");
    setChatNote("");
    setChatLoading(false);
    setChatStatus(null);
    setChatDecisionConfirm(null);
  };

  const sendConsultReply = async () => {
    if (!chatTarget || !chatNote.trim() || chatSending) return;
    setChatSending(true);
    setChatError("");
    try {
      const res = await fetch(`/api/cases/consults/${chatTarget.targetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: chatNote.trim() }),
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) throw new Error(data?.message ?? "相談コメントの送信に失敗しました。");
      setChatNote("");
      await openConsult(chatCaseId, chatTarget);
      await fetchCases();
      void fetchCaseTargets(chatCaseId);
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "相談コメントの送信に失敗しました。");
    } finally {
      setChatSending(false);
    }
  };

  const canSendDecide = chatStatus === "ACCEPTABLE";
  const canSendDecline = chatStatus === "NEGOTIATING" || chatStatus === "ACCEPTABLE";

  const sendDecision = async (nextStatus: "TRANSPORT_DECIDED" | "TRANSPORT_DECLINED") => {
    if (!chatTarget || !chatCaseId || chatSending) return;
    setChatSending(true);
    setChatError("");
    try {
      const res = await fetch(`/api/cases/send-history/${chatTarget.targetId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextStatus }),
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) throw new Error(data?.message ?? "搬送判断の送信に失敗しました。");
      setChatDecisionConfirm(null);
      await openConsult(chatCaseId, chatTarget);
      await fetchCases();
      void fetchCaseTargets(chatCaseId);
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "搬送判断の送信に失敗しました。");
    } finally {
      setChatSending(false);
    }
  };

  const sendDecisionFromRow = async (caseId: string, target: CaseRequestTarget, nextStatus: "TRANSPORT_DECIDED" | "TRANSPORT_DECLINED") => {
    setRowDecisionConfirm({ caseId, targetId: target.targetId, hospitalName: target.hospitalName, nextStatus });
  };

  const closeRowDecisionConfirm = () => {
    if (rowDecisionSending) return;
    setRowDecisionConfirm(null);
  };

  const confirmRowDecision = async () => {
    if (!rowDecisionConfirm || rowDecisionSending) return;
    setRowDecisionSending(true);
    try {
      const res = await fetch(`/api/cases/send-history/${rowDecisionConfirm.targetId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextStatus: rowDecisionConfirm.nextStatus }),
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) throw new Error(data?.message ?? "搬送判断の送信に失敗しました。");
      setRowDecisionConfirm(null);
      await fetchCases();
      void fetchCaseTargets(rowDecisionConfirm.caseId);
    } catch (innerError) {
      setError(innerError instanceof Error ? innerError.message : "搬送判断の送信に失敗しました。");
    } finally {
      setRowDecisionSending(false);
    }
  };

  return (
    <div className="dashboard-shell h-screen overflow-hidden bg-[var(--dashboard-bg)] text-slate-900">
      <div className="flex h-full">
        <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen((v) => !v)} />

        <main className="flex min-w-0 flex-1 flex-col px-4 py-6 sm:px-5 lg:px-6">
          <header className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-teal)]">
              {showFilters ? "CASE SEARCH" : "CASE LIST"}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">事案一覧</h1>
            <p className="mt-1 text-sm text-slate-500">一覧は軽量表示し、選定病院は展開時に読み込みます。</p>
          </header>

          {showFilters ? (
            <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
              <div className="grid grid-cols-12 items-end gap-3">
                <label className="col-span-7">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">キーワード</span>
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="事案ID / 氏名 / 住所 / 主訴"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="col-span-2">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">隊</span>
                  <select
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    {DIVISION_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option || "すべて"}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="col-span-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void fetchCases()}
                    disabled={loading}
                    className="inline-flex items-center rounded-xl bg-[var(--accent-blue)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {loading ? "検索中..." : "検索"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQ("");
                      setDivision("");
                      setTimeout(() => void fetchCases(), 0);
                    }}
                    className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
                  >
                    クリア
                  </button>
                </div>
              </div>
              {hasFilter ? <p className="mt-2 text-xs text-slate-500">フィルタ適用中</p> : null}
              {error ? <p className="mt-2 text-xs font-semibold text-rose-700">{error}</p> : null}
            </section>
          ) : error ? (
            <p className="mb-4 text-xs font-semibold text-rose-700">{error}</p>
          ) : null}

          <section className="min-h-0 flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
            <table className="w-full table-fixed text-sm" data-testid="ems-cases-table">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">事案ID</th>
                  <th className="px-4 py-3">覚知日時</th>
                  <th className="px-4 py-3">現場住所</th>
                  <th className="px-4 py-3">氏名</th>
                  <th className="px-4 py-3">年齢</th>
                  <th className="px-4 py-3">性別</th>
                  <th className="px-4 py-3">ステータス</th>
                  <th className="px-4 py-3">搬送先</th>
                  <th className="px-4 py-3 text-right">詳細</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const expanded = Boolean(expandedCaseIds[row.caseId]);
                  const targets = sortedTargetsByCaseId[row.caseId] ?? [];
                  const targetsLoading = Boolean(targetsLoadingByCaseId[row.caseId]);
                  const targetsError = targetsErrorByCaseId[row.caseId] ?? "";
                  return (
                    <Fragment key={row.caseId}>
                      <tr
                        className="cursor-pointer border-t border-slate-100 transition hover:bg-blue-50/40"
                        data-testid="ems-case-row"
                        data-case-id={row.caseId}
                        onClick={() => toggleExpand(row.caseId)}
                      >
                        <td className="px-4 py-3 font-semibold text-slate-700">
                          <div className="inline-flex items-center gap-2">
                            <span>{row.caseId}</span>
                            {notifiedCaseIds[row.caseId] ? <span className="h-2.5 w-2.5 rounded-full bg-rose-600" aria-label="未読通知あり" /> : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{[formatAwareDateYmd(row.awareDate), row.awareTime].filter(Boolean).join(" ") || "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{row.address || "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{row.name || "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{Number.isFinite(row.age) ? row.age : "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{formatGenderLabel(row.gender)}</td>
                        <td className="px-4 py-3 text-slate-700">{row.incidentStatus}</td>
                        <td className="px-4 py-3 text-slate-700">{row.destination || "-"}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              router.push(`/cases/${encodeURIComponent(row.caseId)}`);
                            }}
                            className="inline-flex items-center rounded-lg bg-[var(--accent-blue)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[color-mix(in_srgb,var(--accent-blue),#000_10%)]"
                          >
                            詳細
                          </button>
                        </td>
                      </tr>
                      <tr className="border-t border-slate-100">
                        <td className="px-0 py-0" colSpan={9}>
                          <div className={`overflow-hidden transition-all duration-300 ease-out ${expanded ? "max-h-[900px] translate-y-0 opacity-100" : "max-h-0 -translate-y-1 opacity-0"}`}>
                            <div className="bg-slate-50 px-4 py-3">
                              {targetsLoading ? (
                                <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500">選定病院を読み込み中...</div>
                              ) : targetsError ? (
                                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">{targetsError}</div>
                              ) : targets.length === 0 ? (
                                <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
                                  {row.requestTargetCount > 0 ? "選定病院データの取得結果が空です。再度展開してください。" : "選定病院はありません。"}
                                </p>
                              ) : (
                                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                  <table className="min-w-[1120px] w-full table-fixed text-xs">
                                    <thead className="bg-slate-100 text-left font-semibold text-slate-500">
                                      <tr>
                                        <th className="px-3 py-2">送信日時</th>
                                        <th className="px-3 py-2">病院名</th>
                                        <th className="px-3 py-2">選定診療科</th>
                                        <th className="px-3 py-2">最新病院コメント</th>
                                        <th className="px-3 py-2">A側返信</th>
                                        <th className="px-3 py-2">ステータス</th>
                                        <th className="px-3 py-2 text-right">搬送決定</th>
                                        <th className="px-3 py-2 text-right">搬送辞退</th>
                                        <th className="px-3 py-2 text-right">相談</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {targets.map((target) => (
                                        <tr
                                          key={target.targetId}
                                          className="border-t border-slate-100"
                                          data-testid="ems-case-target-row"
                                          data-case-id={row.caseId}
                                        >
                                          <td className="px-3 py-2 text-slate-700">{target.sentAt ? formatDateTimeMdHm(target.sentAt) : "-"}</td>
                                          <td className="px-3 py-2 font-semibold text-slate-800">{target.hospitalName}</td>
                                          <td className="px-3 py-2 text-slate-700">{target.selectedDepartments.join(", ") || "-"}</td>
                                          <td className="px-3 py-2 text-slate-700">{target.latestHpComment || "-"}</td>
                                          <td className="px-3 py-2 text-slate-700">{target.latestAReply || "-"}</td>
                                          <td className="px-3 py-2">
                                            <div className="flex items-center gap-2">
                                              <RequestStatusBadge status={target.status} />
                                              {target.status === "NEGOTIATING" && target.lastActor === "HP" ? <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">要返信</span> : null}
                                            </div>
                                          </td>
                                          <td className="px-3 py-2 text-right">
                                            <button
                                              type="button"
                                              disabled={target.status !== "ACCEPTABLE"}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                void sendDecisionFromRow(row.caseId, target, "TRANSPORT_DECIDED");
                                              }}
                                              className="inline-flex h-8 items-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                                            >
                                              搬送決定
                                            </button>
                                          </td>
                                          <td className="px-3 py-2 text-right">
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                void sendDecisionFromRow(row.caseId, target, "TRANSPORT_DECLINED");
                                              }}
                                              className="inline-flex h-8 items-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                                            >
                                              搬送辞退
                                            </button>
                                          </td>
                                          <td className="px-3 py-2 text-right">
                                            <button
                                              type="button"
                                              disabled={target.status !== "NEGOTIATING"}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                void openConsult(row.caseId, target);
                                              }}
                                              className="inline-flex h-8 items-center rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                                            >
                                              相談
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
                {!loading && rows.length === 0 ? <tr><td className="px-5 py-6 text-sm text-slate-500" colSpan={9}>該当する事案はありません。</td></tr> : null}
              </tbody>
            </table>
          </section>
        </main>
      </div>

      <ConsultChatModal
        open={Boolean(chatTarget)}
        title={chatTarget?.hospitalName ?? "相談チャット"}
        subtitle={chatTarget ? `${chatCaseId} / ${chatTarget.requestId}` : undefined}
        status={chatStatus ?? chatTarget?.status}
        messages={chatMessages}
        loading={chatLoading}
        error={chatError}
        note={chatNote}
        noteLabel="救急コメント"
        notePlaceholder="病院側へ返す相談コメントを入力してください"
        sending={chatSending}
        canSend={Boolean(chatNote.trim())}
        onClose={closeConsult}
        onChangeNote={setChatNote}
        onSend={() => void sendConsultReply()}
        topActions={
          <>
            <button
              type="button"
              disabled={chatSending || !canSendDecline}
              onClick={() => setChatDecisionConfirm("TRANSPORT_DECLINED")}
              className="inline-flex h-9 items-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            >
              搬送辞退
            </button>
            <button
              type="button"
              disabled={chatSending || !canSendDecide}
              onClick={() => setChatDecisionConfirm("TRANSPORT_DECIDED")}
              className="inline-flex h-9 items-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            >
              搬送決定
            </button>
          </>
        }
        confirmSection={
          chatDecisionConfirm ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-900">{chatDecisionConfirm === "TRANSPORT_DECIDED" ? "搬送決定を送信しますか？" : "搬送辞退を送信しますか？"}</p>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={chatSending}
                  onClick={() => setChatDecisionConfirm(null)}
                  className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  disabled={chatSending}
                  onClick={() => void sendDecision(chatDecisionConfirm)}
                  className="inline-flex h-9 items-center rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {chatSending ? "送信中..." : "OK"}
                </button>
              </div>
            </div>
          ) : null
        }
      />

      {rowDecisionConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
            <p className="text-base font-bold text-slate-900">{rowDecisionConfirm.nextStatus === "TRANSPORT_DECIDED" ? "搬送決定を送信しますか？" : "搬送辞退を送信しますか？"}</p>
            <p className="mt-2 text-sm text-slate-600">事案ID: <span className="font-semibold text-slate-800">{rowDecisionConfirm.caseId}</span></p>
            <p className="mt-1 text-sm text-slate-600">病院: <span className="font-semibold text-slate-800">{rowDecisionConfirm.hospitalName}</span></p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={rowDecisionSending}
                onClick={closeRowDecisionConfirm}
                className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                キャンセル
              </button>
              <button
                type="button"
                disabled={rowDecisionSending}
                onClick={() => void confirmRowDecision()}
                className="inline-flex h-9 items-center rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {rowDecisionSending ? "送信中..." : "送信"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
