"use client";

import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { CaseSearchTable, type CaseSearchTableRow, type CaseSearchTableTarget } from "@/components/cases/CaseSearchTable";
import { EmsPageHeader } from "@/components/ems/EmsPageHeader";
import { EmsPortalShell } from "@/components/ems/EmsPortalShell";
import { useOfflineState } from "@/components/offline/useOfflineState";
import { ConsultChatModal } from "@/components/shared/ConsultChatModal";
import { DecisionReasonDialog } from "@/components/shared/DecisionReasonDialog";
import { TRANSPORT_DECLINED_REASON_OPTIONS, type TransportDeclinedReasonCode } from "@/lib/decisionReasons";
import { enqueueConsultReply, listOfflineConsultMessages } from "@/lib/offline/offlineConsultQueue";

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
  caseUid?: string;
  targets: CaseSearchTableTarget[];
  message?: string;
};

type ConsultMessage = {
  id: number | string;
  actor: "A" | "HP";
  actedAt: string;
  note: string;
  localStatus?: "未送信" | "送信待ち" | "競合" | "送信失敗";
};

type NotificationSummaryResponse = {
  items?: Array<{
    kind?: string;
    caseId?: string | null;
    caseUid?: string | null;
    isRead?: boolean;
  }>;
};

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
  return (
    <EmsPortalShell operatorName="" operatorCode="">
      <CaseSearchPageContent />
    </EmsPortalShell>
  );
}

function CaseSearchPageContent() {
  const pathname = usePathname();
  const router = useRouter();
  const { isOffline } = useOfflineState();
  const isOfflineRestricted = isOffline;
  const offlineDecisionReason = "この操作はオンライン時のみ実行できます";
  const [q, setQ] = useState("");
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
  const [transportDeclineReasonCode, setTransportDeclineReasonCode] = useState<TransportDeclinedReasonCode | "">("");
  const [transportDeclineReasonText, setTransportDeclineReasonText] = useState("");
  const [transportDeclineReasonError, setTransportDeclineReasonError] = useState("");
  const appliedQueryRef = useRef("");
  const [refreshing, setRefreshing] = useState(false);

  const hasFilter = useMemo(() => q.trim().length > 0, [q]);
  const showFilters = pathname === "/cases/search";
  const fetchCases = async (keyword = appliedQueryRef.current, options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (keyword.trim()) params.set("q", keyword.trim());
      params.set("limit", "200");

      appliedQueryRef.current = keyword;
      const res = await fetch(`/api/cases/search?${params.toString()}`, { cache: "no-store" });
      const data = (await res.json()) as CaseSearchResponse;
      if (!res.ok) throw new Error(data.message ?? "事案一覧の取得に失敗しました。");
      setRows(Array.isArray(data.rows) ? data.rows : []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "事案一覧の取得に失敗しました。");
      setRows([]);
    } finally {
      if (!options?.silent) setLoading(false);
    }
  };

  const fetchCaseTargets = async (caseId: string) => {
    if (targetsLoadingByCaseId[caseId]) return;
    const start = performance.now();
    setTargetsLoadingByCaseId((prev) => ({ ...prev, [caseId]: true }));
    setTargetsErrorByCaseId((prev) => ({ ...prev, [caseId]: "" }));

    try {
      const lookupId = rows.find((item) => item.caseId === caseId)?.caseUid ?? caseId;
      const res = await fetch(`/api/cases/search/${encodeURIComponent(lookupId)}`, { cache: "no-store" });
      const data = (await res.json()) as CaseTargetsResponse;
      if (!res.ok) throw new Error(data.message ?? "送信履歴一覧の取得に失敗しました。");

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
        [caseId]: fetchError instanceof Error ? fetchError.message : "送信履歴一覧の取得に失敗しました。",
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
    void fetchCases("");
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
  const decidedTargetIdByCaseId = useMemo(() => {
    const next: Record<string, number | null> = {};
    for (const [caseId, targets] of Object.entries(sortedTargetsByCaseId)) {
      next[caseId] = targets.find((target) => target.status === "TRANSPORT_DECIDED")?.targetId ?? null;
    }
    return next;
  }, [sortedTargetsByCaseId]);

  const refreshList = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await fetchCases(appliedQueryRef.current);
      const expandedIds = Object.entries(expandedCaseIds)
        .filter(([, isExpanded]) => isExpanded)
        .map(([caseId]) => caseId);
      await Promise.all(expandedIds.map((caseId) => fetchCaseTargets(caseId)));
    } finally {
      setRefreshing(false);
    }
  };

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
      const offlineMessages = await listOfflineConsultMessages(target.targetId);
      setChatStatus(data.status ?? target.status);
      setChatMessages([...(Array.isArray(data.messages) ? data.messages : []), ...offlineMessages]);
    } catch (fetchError) {
      const offlineMessages = await listOfflineConsultMessages(target.targetId).catch(() => []);
      setChatMessages(offlineMessages);
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
      if (isOfflineRestricted) {
        await enqueueConsultReply({ targetId: chatTarget.targetId, serverCaseId: chatCaseId || undefined, note: chatNote.trim() });
        setChatNote("");
        setChatError("オフラインのため未送信キューに保存しました。");
        await openConsult(chatCaseId, chatTarget);
        return;
      }
      const res = await fetch(`/api/cases/consults/${chatTarget.targetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: chatNote.trim() }),
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) throw new Error(data?.message ?? "相談コメントの送信に失敗しました。");
      setChatNote("");
      await openConsult(chatCaseId, chatTarget);
      await fetchCases(appliedQueryRef.current);
      void fetchCaseTargets(chatCaseId);
    } catch (fetchError) {
      setChatError(fetchError instanceof Error ? fetchError.message : "相談コメントの送信に失敗しました。");
    } finally {
      setChatSending(false);
    }
  };

  const chatDecidedTargetId = chatCaseId ? (decidedTargetIdByCaseId[chatCaseId] ?? null) : null;
  const chatDecisionDisabledReason = chatDecidedTargetId !== null ? "搬送先が決まっています。" : offlineDecisionReason;
  const canSendDecide = chatStatus === "ACCEPTABLE" && chatDecidedTargetId === null;
  const canSendDecline =
    (chatStatus === "NEGOTIATING" || chatStatus === "ACCEPTABLE" || chatStatus === "TRANSPORT_DECIDED")
    && (chatDecidedTargetId === null || chatTarget?.targetId === chatDecidedTargetId);

  const sendDecision = async (
    nextStatus: "TRANSPORT_DECIDED" | "TRANSPORT_DECLINED",
    reason?: { reasonCode?: string; reasonText?: string },
  ) => {
    if (!chatTarget || !chatCaseId || chatSending) return;
    if (isOfflineRestricted) {
      setChatError(offlineDecisionReason);
      return;
    }
    if (nextStatus === "TRANSPORT_DECIDED" && chatDecidedTargetId !== null) {
      setChatError("搬送先が決まっています。");
      return;
    }
    if (nextStatus === "TRANSPORT_DECLINED" && chatDecidedTargetId !== null && chatTarget.targetId !== chatDecidedTargetId) {
      setChatError("搬送先が決まっています。");
      return;
    }
    setChatSending(true);
    setChatError("");

    try {
      const res = await fetch(`/api/cases/send-history/${chatTarget.targetId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextStatus, reasonCode: reason?.reasonCode, reasonText: reason?.reasonText }),
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) throw new Error(data?.message ?? "搬送判断の送信に失敗しました。");
      setChatDecisionConfirm(null);
      await openConsult(chatCaseId, chatTarget);
      await fetchCases(appliedQueryRef.current);
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
    resetTransportDeclineReasonState();
  };

  const confirmRowDecision = async () => {
    if (!rowDecisionConfirm || rowDecisionSending) return;
    if (isOfflineRestricted) {
      setError(offlineDecisionReason);
      return;
    }
    const decidedTargetId = decidedTargetIdByCaseId[rowDecisionConfirm.caseId] ?? null;
    if (rowDecisionConfirm.nextStatus === "TRANSPORT_DECIDED" && decidedTargetId !== null) {
      setError("搬送先が決まっています。");
      return;
    }
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
      resetTransportDeclineReasonState();
      await fetchCases(appliedQueryRef.current);
      void fetchCaseTargets(rowDecisionConfirm.caseId);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "搬送判断の送信に失敗しました。");
    } finally {
      setRowDecisionSending(false);
    }
  };

  const resetTransportDeclineReasonState = () => {
    setTransportDeclineReasonCode("");
    setTransportDeclineReasonText("");
    setTransportDeclineReasonError("");
  };

  const closeTransportDeclineDialog = () => {
    if (chatSending || rowDecisionSending) return;
    setChatDecisionConfirm((current) => (current === "TRANSPORT_DECLINED" ? null : current));
    setRowDecisionConfirm((current) => (current?.nextStatus === "TRANSPORT_DECLINED" ? null : current));
    resetTransportDeclineReasonState();
  };

  const confirmTransportDecline = async () => {
    const payload = {
      reasonCode: transportDeclineReasonCode || undefined,
      reasonText: transportDeclineReasonText || undefined,
    };
    if (chatDecisionConfirm === "TRANSPORT_DECLINED") {
      try {
        await sendDecision("TRANSPORT_DECLINED", payload);
        resetTransportDeclineReasonState();
      } catch (error) {
        setTransportDeclineReasonError(error instanceof Error ? error.message : "搬送辞退の送信に失敗しました。");
      }
      return;
    }
    if (!rowDecisionConfirm || rowDecisionConfirm.nextStatus !== "TRANSPORT_DECLINED") return;
    if (isOfflineRestricted) {
      setTransportDeclineReasonError(offlineDecisionReason);
      return;
    }
    const decidedTargetId = decidedTargetIdByCaseId[rowDecisionConfirm.caseId] ?? null;
    if (decidedTargetId !== null && rowDecisionConfirm.targetId !== decidedTargetId) {
      setTransportDeclineReasonError("搬送先が決まっています。");
      return;
    }
    setRowDecisionSending(true);
    try {
      const res = await fetch(`/api/cases/send-history/${rowDecisionConfirm.targetId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextStatus: rowDecisionConfirm.nextStatus, reasonCode: payload.reasonCode, reasonText: payload.reasonText }),
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) throw new Error(data?.message ?? "搬送判断の送信に失敗しました。");
      setRowDecisionConfirm(null);
      resetTransportDeclineReasonState();
      await fetchCases(appliedQueryRef.current);
      void fetchCaseTargets(rowDecisionConfirm.caseId);
    } catch (fetchError) {
      setTransportDeclineReasonError(fetchError instanceof Error ? fetchError.message : "搬送辞退の送信に失敗しました。");
    } finally {
      setRowDecisionSending(false);
    }
  };

  return (
    <>
      <div className="ems-page flex min-w-0 flex-1 flex-col gap-4">
        <EmsPageHeader
          eyebrow={showFilters ? "CASE SEARCH" : "CASE LIST"}
          title="事案一覧"
          description="進行中の事案、搬送先決定、送信先の返答状況を一画面で比較し、次の詳細確認や相談へ短く移動できる一覧です。"
          chip="tablet landscape"
          actions={[
            { label: "新規事案", href: "/cases/new", variant: "secondary" },
            { label: refreshing ? "更新中..." : "更新", onClick: () => void refreshList(), variant: "primary", disabled: refreshing || loading },
          ]}
        />

        {showFilters ? (
          <section className="rounded-[26px] bg-white px-5 py-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.22)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.18em] text-slate-400">FILTER</p>
                <h2 className="mt-1 text-base font-bold tracking-tight text-slate-900">検索条件</h2>
              </div>
              {hasFilter ? <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-semibold text-blue-700">フィルタ適用中</span> : null}
            </div>
            <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
              <label className="min-w-0">
                <span className="ems-type-label mb-1 block font-semibold text-slate-500">キーワード</span>
                <input
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder="事案ID / 氏名 / 住所 / 主訴"
                  className="ems-control ems-type-body h-11 w-full rounded-2xl border border-slate-200 px-4"
                />
              </label>
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => void fetchCases(q)}
                  disabled={loading}
                  className="ems-type-button inline-flex h-11 items-center rounded-2xl bg-[var(--accent-blue)] px-5 font-semibold text-white disabled:opacity-60"
                >
                  {loading ? "検索中..." : "検索"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    window.setTimeout(() => void fetchCases(""), 0);
                  }}
                  className="ems-type-button inline-flex h-11 items-center rounded-2xl bg-slate-100 px-5 font-semibold text-slate-700"
                >
                  クリア
                </button>
              </div>
            </div>
            {error ? <p className="ems-type-label mt-3 font-semibold text-rose-700">{error}</p> : null}
          </section>
        ) : error ? (
          <p className="ems-type-label font-semibold text-rose-700">{error}</p>
        ) : null}

        <section className="min-h-0 flex-1 rounded-[26px] bg-white shadow-[0_18px_42px_-34px_rgba(15,23,42,0.22)]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.18em] text-slate-400">CASE BOARD</p>
              <h2 className="mt-1 text-base font-bold tracking-tight text-slate-900">進行事案</h2>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-500">
              <ArrowPathIcon className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
              {refreshing ? "更新中" : `${rows.length}件表示`}
            </div>
          </div>
          <div className="min-h-0 overflow-auto">
            <CaseSearchTable
              rows={rows}
              loading={loading}
              disableDecisions={isOfflineRestricted}
              decisionDisabledReason={offlineDecisionReason}
              notifiedCaseIds={notifiedCaseIds}
              expandedCaseIds={expandedCaseIds}
              sortedTargetsByCaseId={sortedTargetsByCaseId}
              targetsLoadingByCaseId={targetsLoadingByCaseId}
              targetsErrorByCaseId={targetsErrorByCaseId}
              onToggleExpand={toggleExpand}
              onOpenDetail={(caseId) => {
                const lookupId = rows.find((item) => item.caseId === caseId)?.caseUid ?? caseId;
                router.push(`/cases/${encodeURIComponent(lookupId)}`);
              }}
              onDecision={sendDecisionFromRow}
              onConsult={(caseId, target) => {
                void openConsult(caseId, target);
              }}
            />
          </div>
        </section>
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
        noteLabel="救急隊コメント"
        notePlaceholder="病院側へ共有する相談コメントを入力してください"
        sending={chatSending}
        canSend={Boolean(chatNote.trim())}
        onClose={closeConsult}
        onChangeNote={setChatNote}
        onSend={() => void sendConsultReply()}
        topActions={
          <>
            <button
              type="button"
              title={isOfflineRestricted || !canSendDecline ? chatDecisionDisabledReason : undefined}
              disabled={isOfflineRestricted || chatSending || !canSendDecline}
              onClick={() => setChatDecisionConfirm("TRANSPORT_DECLINED")}
              className="inline-flex h-9 items-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            >
              搬送辞退
            </button>
            <button
              type="button"
              title={isOfflineRestricted || !canSendDecide ? chatDecisionDisabledReason : undefined}
              disabled={isOfflineRestricted || chatSending || !canSendDecide}
              onClick={() => setChatDecisionConfirm("TRANSPORT_DECIDED")}
              className="inline-flex h-9 items-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            >
              搬送決定
            </button>
          </>
        }
        confirmSection={
          chatDecisionConfirm === "TRANSPORT_DECIDED" ? (
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

      <DecisionReasonDialog
        open={chatDecisionConfirm === "TRANSPORT_DECLINED" || rowDecisionConfirm?.nextStatus === "TRANSPORT_DECLINED"}
        title={"\u642c\u9001\u8f9e\u9000\u7406\u7531\u3092\u9078\u629e"}
        description={"\u642c\u9001\u8f9e\u9000\u3092\u9001\u4fe1\u3059\u308b\u306b\u306f\u7406\u7531\u304c\u5fc5\u9808\u3067\u3059\u3002"}
        options={TRANSPORT_DECLINED_REASON_OPTIONS}
        value={transportDeclineReasonCode}
        textValue={transportDeclineReasonText}
        error={transportDeclineReasonError}
        sending={chatSending || rowDecisionSending}
        confirmLabel={"\u642c\u9001\u8f9e\u9000\u3092\u9001\u4fe1"}
        onClose={closeTransportDeclineDialog}
        onChangeValue={setTransportDeclineReasonCode}
        onChangeText={setTransportDeclineReasonText}
        onConfirm={() => void confirmTransportDecline()}
      />

      {rowDecisionConfirm && rowDecisionConfirm.nextStatus === "TRANSPORT_DECIDED" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
            <p className="text-base font-bold text-slate-900">{"\u642c\u9001\u6c7a\u5b9a\u3092\u9001\u4fe1\u3057\u307e\u3059\u304b\uff1f"}</p>
            <p className="mt-2 text-sm text-slate-600">
              {"\u4e8b\u6848ID"}: <span className="font-semibold text-slate-800">{rowDecisionConfirm.caseId}</span>
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {"\u75c5\u9662"}: <span className="font-semibold text-slate-800">{rowDecisionConfirm.hospitalName}</span>
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={rowDecisionSending}
                onClick={closeRowDecisionConfirm}
                className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {"\u30ad\u30e3\u30f3\u30bb\u30eb"}
              </button>
              <button
                type="button"
                disabled={rowDecisionSending}
                onClick={() => void confirmRowDecision()}
                className="inline-flex h-9 items-center rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {rowDecisionSending ? "\u9001\u4fe1\u4e2d..." : "\u9001\u4fe1"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}





