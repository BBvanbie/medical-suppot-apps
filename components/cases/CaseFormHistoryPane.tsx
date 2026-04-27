"use client";

import { useCallback, useEffect, useState } from "react";

import { CaseSendHistoryTable } from "@/components/cases/CaseSendHistoryTable";
import { ConsultChatModal } from "@/components/shared/ConsultChatModal";
import { DecisionReasonDialog } from "@/components/shared/DecisionReasonDialog";
import { TRANSPORT_DECLINED_REASON_OPTIONS, type TransportDeclinedReasonCode } from "@/lib/decisionReasons";
import {
  fetchCaseConsultDetail,
  sendCaseConsultReply,
  updateTransportDecision,
  type TransportDecisionPayload,
} from "@/lib/casesClient";
import { enqueueConsultReply, listOfflineConsultMessages } from "@/lib/offline/offlineConsultQueue";

type SendHistoryItem = {
  targetId: number;
  requestId: string;
  caseId: string;
  sentAt: string;
  status?: "未読" | "既読" | "要相談" | "受入可能" | "受入不可" | "搬送決定" | "搬送辞退" | "辞退";
  hospitalName?: string;
  selectedDepartments?: string[];
  canDecide?: boolean;
  canConsult?: boolean;
  consultComment?: string;
  emsReplyComment?: string;
};

type ConsultMessage = {
  id: number | string;
  actor: "A" | "HP";
  actedAt: string;
  note: string;
  localStatus?: "未送信" | "送信待ち" | "競合" | "送信失敗";
};

type CaseFormHistoryPaneProps = {
  active: boolean;
  caseId: string;
  operationalMode?: "STANDARD" | "TRIAGE";
  sendHistory: SendHistoryItem[];
  onSendHistoryChange: (items: SendHistoryItem[]) => void;
  readOnly?: boolean;
  isOfflineRestricted: boolean;
  offlineDecisionReason: string;
};

export function CaseFormHistoryPane({
  active,
  caseId,
  operationalMode = "STANDARD",
  sendHistory,
  onSendHistoryChange,
  readOnly = false,
  isOfflineRestricted,
  offlineDecisionReason,
}: CaseFormHistoryPaneProps) {
  const isTriage = operationalMode === "TRIAGE";
  const [historyRefreshing, setHistoryRefreshing] = useState(false);
  const [decisionPendingByRequest, setDecisionPendingByRequest] = useState<Record<string, boolean>>({});
  const [decisionConfirm, setDecisionConfirm] = useState<{
    targetId: number;
    action: "TRANSPORT_DECIDED" | "TRANSPORT_DECLINED";
  } | null>(null);
  const [consultModalOpen, setConsultModalOpen] = useState(false);
  const [consultTarget, setConsultTarget] = useState<SendHistoryItem | null>(null);
  const [consultMessages, setConsultMessages] = useState<ConsultMessage[]>([]);
  const [consultLoading, setConsultLoading] = useState(false);
  const [consultError, setConsultError] = useState("");
  const [consultNote, setConsultNote] = useState("");
  const [consultSending, setConsultSending] = useState(false);
  const [consultDecisionConfirm, setConsultDecisionConfirm] = useState<"TRANSPORT_DECIDED" | "TRANSPORT_DECLINED" | null>(null);
  const [transportDeclineReasonCode, setTransportDeclineReasonCode] = useState<TransportDeclinedReasonCode | "">("");
  const [transportDeclineReasonText, setTransportDeclineReasonText] = useState("");
  const [transportDeclineReasonError, setTransportDeclineReasonError] = useState("");

  const decidedTargetId = sendHistory.find((item) => item.status === "搬送決定")?.targetId ?? null;
  const hasTransportDestinationDecided = decidedTargetId !== null;
  const decisionDisabledReason = hasTransportDestinationDecided ? "搬送先が決まっています。" : offlineDecisionReason;
  const shouldDisableDecisionSubmit = hasTransportDestinationDecided || isOfflineRestricted;

  const refreshSendHistory = useCallback(
    async (options?: { quiet?: boolean }) => {
      if (!caseId) return;
      if (!options?.quiet) setHistoryRefreshing(true);
      try {
        const res = await fetch(`/api/cases/send-history?caseRef=${encodeURIComponent(caseId)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { rows?: SendHistoryItem[] };
        if (Array.isArray(data.rows)) {
          const rows = data.rows;
          onSendHistoryChange(rows);
          setConsultTarget((current) => (current ? rows.find((item) => item.targetId === current.targetId) ?? current : current));
        }
      } catch {
        // ignore fetch failures
      } finally {
        if (!options?.quiet) setHistoryRefreshing(false);
      }
    },
    [caseId, onSendHistoryChange],
  );

  useEffect(() => {
    if (!active) return;
    void refreshSendHistory();
    const timerId = window.setInterval(() => {
      void refreshSendHistory({ quiet: true });
    }, 15000);
    return () => window.clearInterval(timerId);
  }, [active, refreshSendHistory]);

  const resetTransportDeclineReasonState = () => {
    setTransportDeclineReasonCode("");
    setTransportDeclineReasonText("");
    setTransportDeclineReasonError("");
  };

  const closeTransportDeclineDialog = () => {
    if (consultSending || (decisionConfirm && decisionPendingByRequest[String(decisionConfirm.targetId)])) return;
    setConsultDecisionConfirm((current) => (current === "TRANSPORT_DECLINED" ? null : current));
    setDecisionConfirm((current) => (current?.action === "TRANSPORT_DECLINED" ? null : current));
    resetTransportDeclineReasonState();
  };

  const closeConsultModal = () => {
    if (consultSending) return;
    setConsultModalOpen(false);
    setConsultTarget(null);
    setConsultMessages([]);
    setConsultError("");
    setConsultNote("");
    setConsultDecisionConfirm(null);
    resetTransportDeclineReasonState();
  };

  const handleTransportDecision = async (
    targetId: number,
    status: "TRANSPORT_DECIDED" | "TRANSPORT_DECLINED",
    reason?: TransportDecisionPayload,
  ) => {
    const key = String(targetId);
    if (isOfflineRestricted) {
      setConsultError(offlineDecisionReason);
      return false;
    }
    if (status === "TRANSPORT_DECIDED" && hasTransportDestinationDecided) {
      setConsultError("搬送先が決まっています。");
      return false;
    }
    if (status === "TRANSPORT_DECLINED" && hasTransportDestinationDecided && decidedTargetId !== targetId) {
      setConsultError("搬送先が決まっています。");
      return false;
    }
    if (!targetId || !caseId || decisionPendingByRequest[key]) return false;

    setDecisionPendingByRequest((prev) => ({ ...prev, [key]: true }));
    try {
      await updateTransportDecision(targetId, {
        caseId,
        action: "DECIDE",
        status,
        reasonCode: reason?.reasonCode,
        reasonText: reason?.reasonText,
      });
      await refreshSendHistory({ quiet: true });
      return true;
    } catch {
      return false;
    } finally {
      setDecisionPendingByRequest((prev) => ({ ...prev, [key]: false }));
    }
  };

  const fetchConsultMessages = async (targetId: number) => {
    setConsultLoading(true);
    setConsultError("");
    try {
      const [data, offlineMessages] = await Promise.all([
        fetchCaseConsultDetail<never, ConsultMessage>(targetId),
        listOfflineConsultMessages(targetId),
      ]);
      setConsultMessages([...data.messages, ...offlineMessages]);
    } catch (error) {
      const offlineMessages = await listOfflineConsultMessages(targetId).catch(() => []);
      setConsultMessages(offlineMessages);
      setConsultError(error instanceof Error ? error.message : "相談履歴の取得に失敗しました。");
    } finally {
      setConsultLoading(false);
    }
  };

  const openConsultModal = async (item: SendHistoryItem) => {
    if (!item.targetId) return;
    setConsultTarget(item);
    setConsultModalOpen(true);
    setConsultNote("");
    setConsultMessages([]);
    setConsultDecisionConfirm(null);
    await fetchConsultMessages(item.targetId);
  };

  const confirmTransportDecline = async () => {
    if (decisionConfirm && hasTransportDestinationDecided && decisionConfirm.targetId !== decidedTargetId) {
      setTransportDeclineReasonError("搬送先が決まっています。");
      return;
    }

    const payload = {
      reasonCode: transportDeclineReasonCode || undefined,
      reasonText: transportDeclineReasonText || undefined,
    };

    if (consultDecisionConfirm === "TRANSPORT_DECLINED" && consultTarget?.targetId) {
      setConsultSending(true);
      setConsultError("");
      try {
        const ok = await handleTransportDecision(consultTarget.targetId, "TRANSPORT_DECLINED", payload);
        if (!ok) throw new Error("搬送判断の送信に失敗しました。");
        resetTransportDeclineReasonState();
        setConsultDecisionConfirm(null);
        closeConsultModal();
      } catch (error) {
        setTransportDeclineReasonError(error instanceof Error ? error.message : "搬送辞退の送信に失敗しました。");
      } finally {
        setConsultSending(false);
      }
      return;
    }

    if (!decisionConfirm || decisionConfirm.action !== "TRANSPORT_DECLINED") return;
    const key = String(decisionConfirm.targetId);
    if (decisionPendingByRequest[key]) return;
    const ok = await handleTransportDecision(decisionConfirm.targetId, "TRANSPORT_DECLINED", payload);
    if (ok) {
      setDecisionConfirm(null);
      resetTransportDeclineReasonState();
      return;
    }
    setTransportDeclineReasonError("搬送辞退の送信に失敗しました。");
  };

  const confirmTransportDecision = async () => {
    if (!decisionConfirm) return;
    if (hasTransportDestinationDecided) {
      setDecisionConfirm(null);
      return;
    }
    const ok = await handleTransportDecision(decisionConfirm.targetId, decisionConfirm.action);
    if (ok) setDecisionConfirm(null);
  };

  const sendConsultReply = async () => {
    if (!consultTarget?.targetId || !consultNote.trim() || consultSending) return;
    setConsultSending(true);
    setConsultError("");
    try {
      if (isOfflineRestricted) {
        await enqueueConsultReply({ targetId: consultTarget.targetId, serverCaseId: caseId, note: consultNote.trim() });
        setConsultNote("");
        setConsultError("オフラインのため未送信キューに保存しました。");
        await fetchConsultMessages(consultTarget.targetId);
        return;
      }

      await sendCaseConsultReply(consultTarget.targetId, consultNote.trim());
      setConsultNote("");
      await fetchConsultMessages(consultTarget.targetId);
    } catch (error) {
      setConsultError(error instanceof Error ? error.message : "相談コメント送信に失敗しました。");
    } finally {
      setConsultSending(false);
    }
  };

  const sendDecisionFromConsult = async (status: "TRANSPORT_DECIDED" | "TRANSPORT_DECLINED") => {
    if (!consultTarget?.targetId || consultSending) return;
    if (status === "TRANSPORT_DECLINED") {
      await confirmTransportDecline();
      return;
    }

    setConsultSending(true);
    setConsultError("");
    try {
      const ok = await handleTransportDecision(consultTarget.targetId, status);
      if (!ok) throw new Error("搬送判断の送信に失敗しました。");
      setConsultDecisionConfirm(null);
      closeConsultModal();
    } catch (error) {
      setConsultError(error instanceof Error ? error.message : "搬送判断の送信に失敗しました。");
    } finally {
      setConsultSending(false);
    }
  };

  return (
    <>
      <CaseSendHistoryTable
        readOnly={readOnly}
        operationalMode={operationalMode}
        sendHistory={sendHistory}
        refreshing={historyRefreshing}
        disableDecisions={isOfflineRestricted}
        decisionDisabledReason={decisionDisabledReason}
        decidedTargetId={decidedTargetId}
        decisionPendingByRequest={decisionPendingByRequest}
        onRefresh={() => void refreshSendHistory()}
        onSelectDecision={setDecisionConfirm}
        onOpenConsult={(item) => void openConsultModal(item)}
      />

      <ConsultChatModal
        open={consultModalOpen}
        title={consultTarget?.hospitalName ?? "相談チャット"}
        subtitle={consultTarget ? `${caseId} / ${consultTarget.requestId}` : undefined}
        status={consultTarget?.status}
        messages={consultMessages}
        loading={consultLoading}
        error={consultError}
        note={consultNote}
        noteLabel="A側コメント"
        notePlaceholder="HP側へ送る相談回答を入力してください"
        sending={consultSending}
        canSend={!readOnly && Boolean(consultNote.trim())}
        onClose={closeConsultModal}
        onChangeNote={setConsultNote}
        onSend={() => void sendConsultReply()}
        topActions={
          readOnly ? null : (
            <>
              <button
                type="button"
                title={shouldDisableDecisionSubmit ? decisionDisabledReason : undefined}
                disabled={shouldDisableDecisionSubmit || consultSending || !consultTarget?.canDecide}
                onClick={() => setConsultDecisionConfirm("TRANSPORT_DECIDED")}
                className={`inline-flex h-9 items-center rounded-lg border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 ${isTriage ? "border-rose-200 bg-rose-600 text-white hover:bg-rose-500" : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"}`}
              >
                搬送決定
              </button>
              <button
                type="button"
                title={isOfflineRestricted || (hasTransportDestinationDecided && consultTarget?.targetId !== decidedTargetId) ? decisionDisabledReason : undefined}
                disabled={isOfflineRestricted || consultSending || !consultTarget?.targetId || (hasTransportDestinationDecided && consultTarget?.targetId !== decidedTargetId)}
                onClick={() => setConsultDecisionConfirm("TRANSPORT_DECLINED")}
                className="inline-flex h-9 items-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              >
                搬送辞退
              </button>
            </>
          )
        }
        confirmSection={
          consultDecisionConfirm === "TRANSPORT_DECIDED" ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-900">搬送決定を送信しますか？</p>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={consultSending}
                  onClick={() => setConsultDecisionConfirm(null)}
                  className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  disabled={consultSending}
                  onClick={() => void sendDecisionFromConsult(consultDecisionConfirm)}
                  className={`inline-flex h-9 items-center rounded-lg px-3 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-300 ${isTriage ? "bg-rose-600 hover:bg-rose-500" : "bg-blue-600 hover:bg-blue-700"}`}
                >
                  {consultSending ? "送信中..." : "OK"}
                </button>
              </div>
            </div>
          ) : null
        }
      />

      <DecisionReasonDialog
        open={consultDecisionConfirm === "TRANSPORT_DECLINED" || decisionConfirm?.action === "TRANSPORT_DECLINED"}
        title="搬送辞退理由を選択"
        description="搬送辞退を送信するには理由の選択が必要です。"
        options={TRANSPORT_DECLINED_REASON_OPTIONS}
        value={transportDeclineReasonCode}
        textValue={transportDeclineReasonText}
        error={transportDeclineReasonError}
        sending={consultSending || Boolean(decisionConfirm && decisionPendingByRequest[String(decisionConfirm.targetId)])}
        confirmLabel="搬送辞退を送信"
        onClose={closeTransportDeclineDialog}
        onChangeValue={setTransportDeclineReasonCode}
        onChangeText={setTransportDeclineReasonText}
        onConfirm={() => void confirmTransportDecline()}
      />

      {decisionConfirm && decisionConfirm.action === "TRANSPORT_DECIDED" ? (
        <div className="modal-shell-pad ds-dialog-backdrop px-4">
          <div className="ds-dialog-surface w-full max-w-md p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">CONFIRM</p>
            <h3 className="mt-2 text-lg font-bold text-slate-900">搬送決定を送信しますか？</h3>
            <p className="mt-2 text-sm text-slate-600">この病院を搬送先として確定します。よろしいですか？</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDecisionConfirm(null)}
                className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
              >
                キャンセル
              </button>
              <button
                type="button"
                disabled={Boolean(decisionPendingByRequest[String(decisionConfirm.targetId)])}
                onClick={() => void confirmTransportDecision()}
                className={`inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-300 ${isTriage ? "bg-rose-600 hover:bg-rose-500" : "bg-[var(--accent-blue)] hover:bg-[color-mix(in_srgb,var(--accent-blue),#000_10%)]"}`}
              >
                {decisionPendingByRequest[String(decisionConfirm.targetId)] ? "送信中..." : "搬送決定"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
