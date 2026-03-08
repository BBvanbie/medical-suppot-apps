"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { CaseSearchTable, type CaseSearchTableRow, type CaseSearchTableTarget } from "@/components/cases/CaseSearchTable";
import { Sidebar } from "@/components/home/Sidebar";
import { ConsultChatModal } from "@/components/shared/ConsultChatModal";

type RequestStatus =
  | "UNREAD"
  | "READ"
  | "NEGOTIATING"
  | "ACCEPTABLE"
  | "NOT_ACCEPTABLE"
  | "TRANSPORT_DECIDED"
  | "TRANSPORT_DECLINED";

type CaseSearchRow = CaseSearchTableRow & {
  division: string;
};

type CaseSearchResponse = {
  rows: CaseSearchRow[];
  message?: string;
};

type CaseTargetsResponse = {
  caseId: string;
  targets: CaseSearchTableTarget[];
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

function getTargetPriority(target: CaseSearchTableTarget): number {
  if (target.status === "TRANSPORT_DECIDED") return 1;
  if (target.status === "ACCEPTABLE") return 2;
  if (target.status === "NEGOTIATING") return 3;
  if (target.status === "NOT_ACCEPTABLE") return 4;
  if (target.status === "TRANSPORT_DECLINED") return 5;
  if (target.status === "READ") return 6;
  return 7;
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
  const [targetsByCaseId, setTargetsByCaseId] = useState<Record<string, CaseSearchTableTarget[]>>({});
  const [targetsLoadingByCaseId, setTargetsLoadingByCaseId] = useState<Record<string, boolean>>({});
  const [targetsErrorByCaseId, setTargetsErrorByCaseId] = useState<Record<string, string>>({});
  const expandTimingsRef = useRef<Record<string, number>>({});

  const [chatTarget, setChatTarget] = useState<CaseSearchTableTarget | null>(null);
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
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "事案一覧の取得に失敗しました。");
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
      if (!res.ok) throw new Error(data.message ?? "選定履歴一覧の取得に失敗しました。");

      const targets = Array.isArray(data.targets) ? data.targets : [];
      setTargetsByCaseId((prev) => ({ ...prev, [caseId]: targets }));

      const fetchMs = performance.now() - start;
      requestAnimationFrame(() => {
        const totalMs = performance.now() - (expandTimingsRef.current[caseId] ?? start);
        console.info("[case-expand]", {
          caseId,
          targets: targets.length,
          fetchMs: Math.round(fetchMs),
          totalMs: Math.round(totalMs),
          source: "network",
        });
      });
    } catch (fetchError) {
      setTargetsErrorByCaseId((prev) => ({
        ...prev,
        [caseId]: fetchError instanceof Error ? fetchError.message : "選定履歴一覧の取得に失敗しました。",
      }));
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
        if (!isRead && caseId && (kind === "hospital_status_changed" || kind === "consult_status_changed")) {
          next[caseId] = true;
        }
      }
      setNotifiedCaseIds(next);
    } catch {
      // noop
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    void fetch("/api/cases/search?limit=200", { cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json()) as CaseSearchResponse;
        if (!res.ok) throw new Error(data.message ?? "事案一覧の取得に失敗しました。");
        if (!active) return;
        setRows(Array.isArray(data.rows) ? data.rows : []);
      })
      .catch((fetchError) => {
        if (!active) return;
        setError(fetchError instanceof Error ? fetchError.message : "事案一覧の取得に失敗しました。");
        setRows([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    void fetchCaseNotifications();
    const timer = window.setInterval(() => void fetchCaseNotifications(), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const sortedTargetsByCaseId = useMemo(() => {
    const next: Record<string, CaseSearchTableTarget[]> = {};
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
        console.info("[case-expand]", {
          caseId,
          targets: targetsByCaseId[caseId].length,
          fetchMs: 0,
          totalMs: Math.round(totalMs),
          source: "cache",
        });
      });
      return;
    }

    void fetchCaseTargets(caseId);
  };

  const openConsult = async (caseId: string, target: CaseSearchTableTarget) => {
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
    } catch (fetchError) {
      setChatError(fetchError instanceof Error ? fetchError.message : "相談履歴の取得に失敗しました。");
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
    } catch (fetchError) {
      setChatError(fetchError instanceof Error ? fetchError.message : "相談コメントの送信に失敗しました。");
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
    } catch (fetchError) {
      setChatError(fetchError instanceof Error ? fetchError.message : "搬送判断の送信に失敗しました。");
    } finally {
      setChatSending(false);
    }
  };

  const sendDecisionFromRow = (caseId: string, target: CaseSearchTableTarget, nextStatus: "TRANSPORT_DECIDED" | "TRANSPORT_DECLINED") => {
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
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "搬送判断の送信に失敗しました。");
    } finally {
      setRowDecisionSending(false);
    }
  };

  return (
    <div className="dashboard-shell h-screen overflow-hidden bg-[var(--dashboard-bg)] text-slate-900">
      <div className="flex h-full">
        <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen((value) => !value)} />

        <main className="flex min-w-0 flex-1 flex-col px-4 py-6 sm:px-5 lg:px-6">
          <header className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-teal)]">
              {showFilters ? "CASE SEARCH" : "CASE LIST"}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">事案一覧</h1>
            <p className="mt-1 text-sm text-slate-500">事案を一覧表示し、展開した子行で送信履歴や病院との相談状況を確認できます。</p>
          </header>

          {showFilters ? (
            <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
              <div className="grid grid-cols-12 items-end gap-3">
                <label className="col-span-7">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">キーワード</span>
                  <input
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    placeholder="事案ID / 氏名 / 住所 / 主訴"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="col-span-2">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">隊</span>
                  <select
                    value={division}
                    onChange={(event) => setDivision(event.target.value)}
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
                      window.setTimeout(() => void fetchCases(), 0);
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
            <CaseSearchTable
              rows={rows}
              loading={loading}
              notifiedCaseIds={notifiedCaseIds}
              expandedCaseIds={expandedCaseIds}
              sortedTargetsByCaseId={sortedTargetsByCaseId}
              targetsLoadingByCaseId={targetsLoadingByCaseId}
              targetsErrorByCaseId={targetsErrorByCaseId}
              onToggleExpand={toggleExpand}
              onOpenDetail={(caseId) => router.push(`/cases/${encodeURIComponent(caseId)}`)}
              onDecision={sendDecisionFromRow}
              onConsult={(caseId, target) => {
                void openConsult(caseId, target);
              }}
            />
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
        noteLabel="A側コメント"
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
              <p className="text-sm font-semibold text-slate-900">
                {chatDecisionConfirm === "TRANSPORT_DECIDED" ? "搬送決定を送信しますか？" : "搬送辞退を送信しますか？"}
              </p>
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
            <p className="text-base font-bold text-slate-900">
              {rowDecisionConfirm.nextStatus === "TRANSPORT_DECIDED" ? "搬送決定を送信しますか？" : "搬送辞退を送信しますか？"}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              事案ID: <span className="font-semibold text-slate-800">{rowDecisionConfirm.caseId}</span>
            </p>
            <p className="mt-1 text-sm text-slate-600">
              病院: <span className="font-semibold text-slate-800">{rowDecisionConfirm.hospitalName}</span>
            </p>
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
