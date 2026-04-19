"use client";

import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { CaseSearchTable, type CaseSearchTableRow, type CaseSearchTableTarget } from "@/components/cases/CaseSearchTable";
import { EmsPageHeader } from "@/components/ems/EmsPageHeader";
import { useOfflineState } from "@/components/offline/useOfflineState";
import { ConsultChatModal } from "@/components/shared/ConsultChatModal";
import { DecisionReasonDialog } from "@/components/shared/DecisionReasonDialog";
import { SectionPanelFrame } from "@/components/shared/SectionPanelFrame";
import { TRANSPORT_DECLINED_REASON_OPTIONS, type TransportDeclinedReasonCode } from "@/lib/decisionReasons";
import { updateTransportDecision } from "@/lib/casesClient";
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

const CASE_SEARCH_PAGE_LIMIT = 40;

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

export function CaseSearchPageContent() {
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
  const warmedTargetCaseIdsRef = useRef<Record<string, boolean>>({});

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
  const requestCaseTargets = useCallback(async (caseId: string, lookupId: string, options?: { background?: boolean }) => {
    if (targetsLoadingByCaseId[caseId]) return;
    const start = performance.now();
    setTargetsLoadingByCaseId((prev) => ({ ...prev, [caseId]: true }));
    setTargetsErrorByCaseId((prev) => ({ ...prev, [caseId]: "" }));

    try {
      const res = await fetch(`/api/cases/search/${encodeURIComponent(lookupId)}`, { cache: "no-store" });
      const data = (await res.json()) as CaseTargetsResponse;
      if (!res.ok) throw new Error(data.message ?? "送信履歴一覧の取得に失敗しました。");

      const targets = Array.isArray(data.targets) ? data.targets : [];
      setTargetsByCaseId((prev) => ({ ...prev, [caseId]: targets }));

      const fetchMs = performance.now() - start;
      if (!options?.background) {
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
      }
    } catch (fetchError) {
      setTargetsErrorByCaseId((prev) => ({
        ...prev,
        [caseId]: fetchError instanceof Error ? fetchError.message : "送信履歴一覧の取得に失敗しました。",
      }));
    } finally {
      setTargetsLoadingByCaseId((prev) => ({ ...prev, [caseId]: false }));
    }
  }, [targetsLoadingByCaseId]);

  const fetchCases = useCallback(async (keyword = appliedQueryRef.current, options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (keyword.trim()) params.set("q", keyword.trim());
      params.set("limit", String(CASE_SEARCH_PAGE_LIMIT));

      appliedQueryRef.current = keyword;
      const res = await fetch(`/api/cases/search?${params.toString()}`, { cache: "no-store" });
      const data = (await res.json()) as CaseSearchResponse;
      if (!res.ok) throw new Error(data.message ?? "事案一覧の取得に失敗しました。");

      const nextRows = Array.isArray(data.rows) ? data.rows : [];
      for (const row of nextRows.slice(0, 8)) {
        const lookupId = row.caseUid ?? row.caseId;
        if (!lookupId) continue;
        router.prefetch(`/cases/${encodeURIComponent(lookupId)}`);
      }
      for (const row of nextRows.slice(0, 4)) {
        const lookupId = row.caseUid ?? row.caseId;
        if (!lookupId || (row.requestTargetCount ?? 0) === 0 || warmedTargetCaseIdsRef.current[row.caseId]) continue;
        warmedTargetCaseIdsRef.current[row.caseId] = true;
        void requestCaseTargets(row.caseId, lookupId, { background: true });
      }

      setRows(nextRows);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "事案一覧の取得に失敗しました。");
      setRows([]);
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [requestCaseTargets, router]);

  const fetchCaseTargets = useCallback(async (caseId: string) => {
    const lookupId = rows.find((item) => item.caseId === caseId)?.caseUid ?? caseId;
    await requestCaseTargets(caseId, lookupId);
  }, [requestCaseTargets, rows]);

  const fetchCaseNotifications = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    void fetchCases("");
  }, [fetchCases]);

  useEffect(() => {
    if (loading) return;
    const initialTimer = window.setTimeout(() => void fetchCaseNotifications(), 250);
    const timer = window.setInterval(() => void fetchCaseNotifications(), 15000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [fetchCaseNotifications, loading]);

  useEffect(() => {
    const prefetched = new Set<string>();
    for (const row of rows.slice(0, 8)) {
      const lookupId = row.caseUid ?? row.caseId;
      if (!lookupId || prefetched.has(lookupId)) continue;
      prefetched.add(lookupId);
      router.prefetch(`/cases/${encodeURIComponent(lookupId)}`);
    }
  }, [rows, router]);

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
    if (row) {
      const lookupId = row.caseUid ?? row.caseId;
      router.prefetch(`/cases/${encodeURIComponent(lookupId)}`);
    }
    const hasUsableCache =
      Array.isArray(cachedTargets) &&
      (cachedTargets.length > 0 || (row?.requestTargetCount ?? 0) === 0);

    if (hasUsableCache) {
      requestAnimationFrame(() => {
        const totalMs = performance.now() - (expandTimingsRef.current[caseId] ?? performance.now());
        console.info("[case-expand]", {
          caseId,
          targets: cachedTargets.length,
          fetchMs: 0,
          totalMs: Math.round(totalMs),
          source: "cache",
        });
      });
      return;
    }

    void fetchCaseTargets(caseId);
  };

  const closeConsult = () => {
    setChatTarget(null);
    setChatCaseId("");
    setChatMessages([]);
    setChatError("");
    setChatNote("");
    setChatSending(false);
    setChatStatus(null);
    setChatDecisionConfirm(null);
  };

  const openConsult = async (caseId: string, target: CaseSearchTableTarget) => {
    setChatTarget(target);
    setChatCaseId(caseId);
    setChatMessages([]);
    setChatError("");
    setChatNote("");
    setChatLoading(true);
    setChatStatus(target.status);
    try {
      const res = await fetch(`/api/hospitals/requests/${target.targetId}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((data && typeof data === "object" && "message" in data ? String(data.message) : "") || "相談履歴の取得に失敗しました。");

      const serverMessages = Array.isArray(data?.comments)
        ? data.comments.map((item: { id?: number; actor?: string; actedAt?: string; note?: string }) => ({
            id: item.id ?? `server-${Math.random()}`,
            actor: item.actor === "HP" ? "HP" : "A",
            actedAt: item.actedAt ?? new Date().toISOString(),
            note: item.note ?? "",
          }))
        : [];
      const offlineMessages = await listOfflineConsultMessages(target.targetId);
      setChatMessages([...serverMessages, ...offlineMessages]);
    } catch (fetchError) {
      setChatError(fetchError instanceof Error ? fetchError.message : "相談履歴の取得に失敗しました。");
    } finally {
      setChatLoading(false);
    }
  };

  const sendConsultReply = async () => {
    if (!chatTarget || !chatCaseId || !chatNote.trim()) return;
    setChatSending(true);
    setChatError("");
    try {
      if (isOfflineRestricted) {
        const queued = await enqueueConsultReply({
          targetId: chatTarget.targetId,
          serverCaseId: chatCaseId,
          note: chatNote.trim(),
        });
        setChatMessages((prev) => [
          ...prev,
          {
            id: queued.id,
            actor: "A",
            actedAt: queued.createdAt,
            note: chatNote.trim(),
            localStatus: "未送信",
          },
        ]);
        setChatNote("");
        return;
      }

      const response = await fetch(`/api/hospitals/requests/${chatTarget.targetId}/consult`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: chatCaseId,
          note: chatNote.trim(),
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error((body && typeof body === "object" && "message" in body ? String(body.message) : "") || "相談コメントの送信に失敗しました。");
      }

      setChatNote("");
      await openConsult(chatCaseId, chatTarget);
      await fetchCaseNotifications();
    } catch (sendError) {
      setChatError(sendError instanceof Error ? sendError.message : "相談コメントの送信に失敗しました。");
    } finally {
      setChatSending(false);
    }
  };

  const closeRowDecisionConfirm = () => {
    setRowDecisionConfirm(null);
    setTransportDeclineReasonCode("");
    setTransportDeclineReasonText("");
    setTransportDeclineReasonError("");
  };

  const closeTransportDeclineDialog = () => {
    setChatDecisionConfirm(null);
    closeRowDecisionConfirm();
    setTransportDeclineReasonCode("");
    setTransportDeclineReasonText("");
    setTransportDeclineReasonError("");
  };

  const postDecision = async (payload: {
    caseId: string;
    targetId: number;
    nextStatus: "TRANSPORT_DECIDED" | "TRANSPORT_DECLINED";
    transportDeclinedReasonCode?: TransportDeclinedReasonCode;
    transportDeclinedReasonText?: string;
  }) => {
    await updateTransportDecision(payload.targetId, {
      caseRef: payload.caseId,
      action: "DECIDE",
      status: payload.nextStatus,
      reasonCode: payload.transportDeclinedReasonCode,
      reasonText: payload.transportDeclinedReasonText,
    });
  };

  const validateTransportDeclineReason = () => {
    if (!transportDeclineReasonCode) {
      setTransportDeclineReasonError("搬送辞退理由を選択してください。");
      return false;
    }
    setTransportDeclineReasonError("");
    return true;
  };

  const confirmTransportDecline = async () => {
    if (!validateTransportDeclineReason()) return;

    if (rowDecisionConfirm) {
      setRowDecisionSending(true);
      try {
        await postDecision({
          caseId: rowDecisionConfirm.caseId,
          targetId: rowDecisionConfirm.targetId,
          nextStatus: "TRANSPORT_DECLINED",
          transportDeclinedReasonCode: transportDeclineReasonCode as TransportDeclinedReasonCode,
          transportDeclinedReasonText: transportDeclineReasonText.trim() || undefined,
        });
        closeTransportDeclineDialog();
        await refreshList();
        await fetchCaseNotifications();
      } catch (decisionError) {
        setTransportDeclineReasonError(decisionError instanceof Error ? decisionError.message : "搬送辞退の送信に失敗しました。");
      } finally {
        setRowDecisionSending(false);
      }
      return;
    }

    if (!chatTarget || !chatCaseId) return;
    await sendDecision("TRANSPORT_DECLINED");
  };

  const sendDecision = async (nextStatus: "TRANSPORT_DECIDED" | "TRANSPORT_DECLINED") => {
    if (!chatTarget || !chatCaseId) return;
    if (nextStatus === "TRANSPORT_DECLINED" && !validateTransportDeclineReason()) return;

    setChatSending(true);
    setChatError("");
    try {
      await postDecision({
        caseId: chatCaseId,
        targetId: chatTarget.targetId,
        nextStatus,
        transportDeclinedReasonCode: nextStatus === "TRANSPORT_DECLINED" ? (transportDeclineReasonCode as TransportDeclinedReasonCode) : undefined,
        transportDeclinedReasonText: nextStatus === "TRANSPORT_DECLINED" ? transportDeclineReasonText.trim() || undefined : undefined,
      });

      closeTransportDeclineDialog();
      await refreshList();
      await fetchCaseNotifications();
      closeConsult();
    } catch (decisionError) {
      setChatError(decisionError instanceof Error ? decisionError.message : "搬送判断の送信に失敗しました。");
    } finally {
      setChatSending(false);
    }
  };

  const sendDecisionFromRow = (
    caseId: string,
    target: CaseSearchTableTarget,
    nextStatus: "TRANSPORT_DECIDED" | "TRANSPORT_DECLINED",
  ) => {
    if (nextStatus === "TRANSPORT_DECLINED") {
      setRowDecisionConfirm({
        caseId,
        targetId: target.targetId,
        hospitalName: target.hospitalName,
        nextStatus,
      });
      return;
    }
    setRowDecisionConfirm({
      caseId,
      targetId: target.targetId,
      hospitalName: target.hospitalName,
      nextStatus,
    });
  };

  const confirmRowDecision = async () => {
    if (!rowDecisionConfirm) return;
    setRowDecisionSending(true);
    try {
      await postDecision({
        caseId: rowDecisionConfirm.caseId,
        targetId: rowDecisionConfirm.targetId,
        nextStatus: rowDecisionConfirm.nextStatus,
      });
      closeRowDecisionConfirm();
      await refreshList();
      await fetchCaseNotifications();
    } catch (decisionError) {
      const message = decisionError instanceof Error ? decisionError.message : "搬送判断の送信に失敗しました。";
      if (rowDecisionConfirm.nextStatus === "TRANSPORT_DECLINED") {
        setTransportDeclineReasonError(message);
      } else {
        setError(message);
      }
    } finally {
      setRowDecisionSending(false);
    }
  };

  const canSendDecide = chatStatus !== "TRANSPORT_DECIDED" && chatStatus !== "TRANSPORT_DECLINED";
  const canSendDecline = chatStatus !== "TRANSPORT_DECIDED" && chatStatus !== "TRANSPORT_DECLINED";
  const chatDecisionDisabledReason = offlineDecisionReason;

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
          <SectionPanelFrame
            kicker="FILTER"
            title="検索条件"
            actions={hasFilter ? <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-semibold text-blue-700">フィルタ適用中</span> : null}
            bodyClassName="mt-3"
          >
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
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
          </SectionPanelFrame>
        ) : error ? (
          <p className="ems-type-label font-semibold text-rose-700">{error}</p>
        ) : null}

        <SectionPanelFrame
          kicker="CASE BOARD"
          title="進行事案"
          className="min-h-0 flex flex-1 flex-col rounded-[26px] bg-white shadow-[0_18px_42px_-34px_rgba(15,23,42,0.22)]"
          headerClassName="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3"
          actions={
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-500">
              <ArrowPathIcon className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
              {refreshing ? "更新中" : `${rows.length}件表示`}
            </div>
          }
          bodyClassName="min-h-0 overflow-auto"
        >
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
        </SectionPanelFrame>
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
        title={"搬送辞退理由を選択"}
        description={"搬送辞退を送信するには理由が必須です。"}
        options={TRANSPORT_DECLINED_REASON_OPTIONS}
        value={transportDeclineReasonCode}
        textValue={transportDeclineReasonText}
        error={transportDeclineReasonError}
        sending={chatSending || rowDecisionSending}
        confirmLabel={"搬送辞退を送信"}
        onClose={closeTransportDeclineDialog}
        onChangeValue={setTransportDeclineReasonCode}
        onChangeText={setTransportDeclineReasonText}
        onConfirm={() => void confirmTransportDecline()}
      />

      {rowDecisionConfirm && rowDecisionConfirm.nextStatus === "TRANSPORT_DECIDED" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
            <p className="text-base font-bold text-slate-900">{"搬送決定を送信しますか？"}</p>
            <p className="mt-2 text-sm text-slate-600">
              {"事案ID"}: <span className="font-semibold text-slate-800">{rowDecisionConfirm.caseId}</span>
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {"病院"}: <span className="font-semibold text-slate-800">{rowDecisionConfirm.hospitalName}</span>
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={rowDecisionSending}
                onClick={closeRowDecisionConfirm}
                className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {"キャンセル"}
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
    </>
  );
}
