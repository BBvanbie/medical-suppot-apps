"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { XMarkIcon } from "@heroicons/react/24/solid";

import { HospitalRequestDetail } from "@/components/hospitals/HospitalRequestDetail";
import { useHospitalRequestApi } from "@/components/hospitals/useHospitalRequestApi";
import { BUTTON_BASE_CLASS, BUTTON_VARIANT_CLASS } from "@/components/shared/buttonStyles";
import { ConsultChatModal } from "@/components/shared/ConsultChatModal";
import { DetailDialogFrame } from "@/components/shared/DetailDialogFrame";
import { DecisionReasonDialog } from "@/components/shared/DecisionReasonDialog";
import { RequestStatusBadge } from "@/components/shared/RequestStatusBadge";
import { HOSPITAL_NOT_ACCEPTABLE_REASON_OPTIONS, type HospitalNotAcceptableReasonCode } from "@/lib/decisionReasons";
import { formatAwareDateYmd, formatDateTimeMdHm } from "@/lib/dateTimeFormat";
import {
  getHospitalDepartmentPrioritySummary,
  getHospitalNextActionLabel,
} from "@/lib/hospitalPriority";

type RequestRow = {
  targetId: number;
  requestId: string;
  caseId: string;
  status: string;
  statusLabel: string;
  sentAt: string;
  openedAt: string | null;
  awareDate: string;
  awareTime: string;
  dispatchAddress: string;
  fromTeamCode: string | null;
  fromTeamName: string | null;
  fromTeamPhone: string | null;
  selectedDepartments: string[];
};

type HospitalRequestsTableProps = {
  rows: RequestRow[];
  consultTemplate?: string;
};

type RequestAttentionLevel = "normal" | "warning" | "danger" | "critical";

function getRequestAttentionLevel(status: string, openedAt: string | null, now: number): RequestAttentionLevel {
  if (status !== "READ" || !openedAt) return "normal";
  const openedAtMs = new Date(openedAt).getTime();
  if (Number.isNaN(openedAtMs)) return "normal";
  const elapsedMinutes = (now - openedAtMs) / 60000;
  if (elapsedMinutes >= 20) return "critical";
  if (elapsedMinutes >= 15) return "danger";
  if (elapsedMinutes >= 10) return "warning";
  return "normal";
}

function getRequestAttentionRowClass(level: RequestAttentionLevel): string {
  if (level === "warning") return "border-amber-200 bg-amber-50/70";
  if (level === "danger") return "border-rose-200 bg-rose-50/80";
  if (level === "critical") return "border-rose-300 bg-rose-100/90";
  return "";
}

function getPriorityChipClass(summary: string | null) {
  if (summary === "救命優先") return "bg-rose-50 text-rose-700";
  if (summary === "CCU優先") return "bg-blue-50 text-blue-700";
  if (summary === "脳卒中優先") return "bg-violet-50 text-violet-700";
  return "bg-slate-100 text-slate-600";
}

function getActionChipClass(status: string) {
  if (status === "NEGOTIATING") return "bg-blue-50 text-blue-700";
  if (status === "READ") return "bg-amber-50 text-amber-700";
  if (status === "UNREAD") return "bg-slate-100 text-slate-700";
  if (status === "ACCEPTABLE") return "bg-emerald-50 text-emerald-700";
  return "bg-slate-100 text-slate-700";
}

function RequestInfoBlock({ label, value, strong = false }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">{label}</p>
      <div className={`mt-1 min-w-0 text-sm leading-6 ${strong ? "font-semibold text-slate-900" : "text-slate-700"}`}>{value}</div>
    </div>
  );
}

export function HospitalRequestsTable({ rows, consultTemplate = "" }: HospitalRequestsTableProps) {
  const router = useRouter();
  const {
    detail,
    detailLoading,
    detailError,
    fetchDetail,
    resetDetail,
    messages: consultMessages,
    messagesLoading: consultLoading,
    messagesError: consultError,
    fetchMessages: fetchConsultMessages,
    resetMessages,
    updateStatus,
  } = useHospitalRequestApi();

  const [activeTargetId, setActiveTargetId] = useState<number | null>(null);
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [consultTargetId, setConsultTargetId] = useState<number | null>(null);
  const [consultTitle, setConsultTitle] = useState("");
  const [consultSending, setConsultSending] = useState(false);
  const [consultNote, setConsultNote] = useState("");
  const [consultDecisionConfirm, setConsultDecisionConfirm] = useState<"ACCEPTABLE" | null>(null);
  const [consultCurrentStatus, setConsultCurrentStatus] = useState<string>("");
  const [consultTeamPhone, setConsultTeamPhone] = useState<string>("");
  const [consultTemplateSelection, setConsultTemplateSelection] = useState("");
  const [isNotAcceptableReasonOpen, setIsNotAcceptableReasonOpen] = useState(false);
  const [notAcceptableReasonCode, setNotAcceptableReasonCode] = useState<HospitalNotAcceptableReasonCode | "">("");
  const [notAcceptableReasonText, setNotAcceptableReasonText] = useState("");
  const [notAcceptableError, setNotAcceptableError] = useState("");
  const [isPhoneCallModalOpen, setIsPhoneCallModalOpen] = useState(false);
  const [phoneCallNumber, setPhoneCallNumber] = useState("");
  const [isSendCompleteModalOpen, setIsSendCompleteModalOpen] = useState(false);
  const [sendCompleteMessage, setSendCompleteMessage] = useState("");
  const [nowTs, setNowTs] = useState(() => Date.now());
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warmedTargetIdsRef = useRef<Record<number, boolean>>({});

  useEffect(() => {
    const timer = window.setInterval(() => setNowTs(Date.now()), 30000);
    return () => {
      window.clearInterval(timer);
      if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    };
  }, []);

  const openSendCompleteModal = (message: string) => {
    if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    setSendCompleteMessage(message);
    setIsSendCompleteModalOpen(true);
    completeTimerRef.current = setTimeout(() => {
      closeConsult(true);
      setIsSendCompleteModalOpen(false);
      setSendCompleteMessage("");
      router.refresh();
    }, 3000);
  };

  const closeSendCompleteModal = () => {
    if (completeTimerRef.current) {
      clearTimeout(completeTimerRef.current);
      completeTimerRef.current = null;
    }
    setIsSendCompleteModalOpen(false);
    setSendCompleteMessage("");
  };

  const normalizedRows = useMemo(
    () => rows.map((row) => ({ ...row, sentAtLabel: formatDateTimeMdHm(row.sentAt) })),
    [rows],
  );

  useEffect(() => {
    if (normalizedRows.length === 0) return;
    const timerId = window.setTimeout(() => {
      for (const row of normalizedRows.slice(0, 4)) {
        if (warmedTargetIdsRef.current[row.targetId]) continue;
        warmedTargetIdsRef.current[row.targetId] = true;
        void fetchDetail(row.targetId, { background: true });
      }
    }, 120);

    return () => window.clearTimeout(timerId);
  }, [fetchDetail, normalizedRows]);

  const openDetail = async (targetId: number) => {
    setActiveTargetId(targetId);
    await fetchDetail(targetId);
  };

  const closeDetail = () => {
    setActiveTargetId(null);
    resetDetail();
  };

  const openConsult = async (row: RequestRow) => {
    setConsultTargetId(row.targetId);
    setConsultTitle(`${row.caseId} / ${row.requestId}`);
    setConsultCurrentStatus(row.status);
    setConsultTeamPhone(row.fromTeamPhone ?? "");
    setConsultNote("");
    setConsultTemplateSelection("");
    setIsConsultModalOpen(true);
    resetMessages();
    await fetchConsultMessages(row.targetId);
  };

  const closeConsult = (force = false) => {
    if (consultSending && !force) return;
    setIsConsultModalOpen(false);
    setConsultTargetId(null);
    setConsultTitle("");
    setConsultNote("");
    setConsultTemplateSelection("");
    resetMessages();
    setConsultDecisionConfirm(null);
    setConsultCurrentStatus("");
    setConsultTeamPhone("");
    setIsNotAcceptableReasonOpen(false);
    setNotAcceptableError("");
  };

  const sendConsult = async () => {
    if (!consultTargetId || !consultNote.trim() || consultSending) return;
    setConsultSending(true);
    try {
      const result = await updateStatus(consultTargetId, "NEGOTIATING", consultNote.trim());
      if (!result.ok) throw new Error(result.message);
      setConsultCurrentStatus("NEGOTIATING");
      setConsultNote("");
      setConsultTemplateSelection("");
      await fetchConsultMessages(consultTargetId);
    } catch {
      // handled by API hook / modal error area
    } finally {
      setConsultSending(false);
    }
  };

  const sendAcceptableFromConsult = async () => {
    if (!consultTargetId || consultSending) return;
    setConsultSending(true);
    try {
      const result = await updateStatus(consultTargetId, "ACCEPTABLE");
      if (!result.ok) throw new Error(result.message);
      setConsultDecisionConfirm(null);
      setConsultCurrentStatus("ACCEPTABLE");
      await fetchConsultMessages(consultTargetId);
      openSendCompleteModal("受入可能を送信しました。");
      router.refresh();
    } catch {
      // handled by API hook / modal error area
    } finally {
      setConsultSending(false);
    }
  };

  const openNotAcceptableReasonDialog = () => {
    setNotAcceptableReasonCode("");
    setNotAcceptableReasonText("");
    setNotAcceptableError("");
    setIsNotAcceptableReasonOpen(true);
  };

  const sendNotAcceptableFromConsult = async () => {
    if (!consultTargetId || consultSending) return;
    setConsultSending(true);
    const result = await updateStatus(consultTargetId, "NOT_ACCEPTABLE", undefined, {
      reasonCode: notAcceptableReasonCode || undefined,
      reasonText: notAcceptableReasonText || undefined,
    });
    if (!result.ok) {
      setNotAcceptableError(result.message);
      setConsultSending(false);
      return;
    }
    setIsNotAcceptableReasonOpen(false);
    if (consultCurrentStatus === "ACCEPTABLE" || consultCurrentStatus === "TRANSPORT_DECIDED") {
      setPhoneCallNumber(consultTeamPhone?.trim() || "-");
      closeConsult(true);
      setIsPhoneCallModalOpen(true);
      router.refresh();
      setConsultSending(false);
      return;
    }
    closeConsult(true);
    openSendCompleteModal("受入不可を送信しました。");
    router.refresh();
    setConsultSending(false);
  };

  return (
    <div className="space-y-3" data-testid="hospital-requests-table">
      {normalizedRows.length === 0 ? (
        <div className="ds-table-surface px-4 py-8 text-sm text-slate-500">受入要請はまだありません。</div>
      ) : null}
      {normalizedRows.map((row) => {
        const attentionLevel = getRequestAttentionLevel(row.status, row.openedAt, nowTs);
        const attentionClass = getRequestAttentionRowClass(attentionLevel);
        const prioritySummary = getHospitalDepartmentPrioritySummary(row.selectedDepartments);
        const nextActionLabel = getHospitalNextActionLabel(row.status);
        return (
          <article
            key={row.targetId}
            className={`ds-table-surface border border-slate-200 px-4 py-4 transition hover:border-emerald-200 ${attentionClass}`}
            data-testid="hospital-request-row"
            data-target-id={row.targetId}
          >
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <RequestStatusBadge status={row.status} />
                  {prioritySummary ? (
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getPriorityChipClass(prioritySummary)}`}>
                      {prioritySummary}
                    </span>
                  ) : null}
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getActionChipClass(row.status)}`}>
                    {nextActionLabel}
                  </span>
                  <p className="text-base font-bold text-slate-950">{row.caseId}</p>
                  <p className="text-xs font-semibold text-slate-500">{row.requestId}</p>
                  {attentionLevel !== "normal" ? <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">応答確認</span> : null}
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,0.95fr)_minmax(0,0.75fr)_minmax(0,1.2fr)]">
                  <RequestInfoBlock label="選定科目" value={<p className="line-clamp-2">{row.selectedDepartments.join(", ") || "-"}</p>} strong />
                  <RequestInfoBlock label="覚知" value={[formatAwareDateYmd(row.awareDate), row.awareTime].filter(Boolean).join(" ") || "-"} />
                  <RequestInfoBlock label="送信" value={row.sentAtLabel} />
                  <RequestInfoBlock label="現場住所" value={<p className="line-clamp-2">{row.dispatchAddress || "-"}</p>} />
                </div>
              </div>
              <div className="flex items-start justify-end gap-2">
                <button type="button" data-testid="hospital-request-detail-button" data-target-id={row.targetId} onClick={() => void openDetail(row.targetId)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700"><span>詳細</span></button>
                {row.status === "NEGOTIATING" ? <button type="button" data-testid="hospital-request-consult-button" data-target-id={row.targetId} onClick={() => void openConsult(row)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"><span>相談</span></button> : null}
              </div>
            </div>
            <div className="mt-4 grid gap-3 border-t border-slate-100 pt-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.05fr)_minmax(0,0.8fr)]">
              <RequestInfoBlock label="送信元救急隊" value={<>{row.fromTeamName ?? "-"}{row.fromTeamCode ? <span className="ml-2 text-xs text-slate-500">({row.fromTeamCode})</span> : null}</>} strong />
              <RequestInfoBlock label="次に見ること" value={nextActionLabel} />
              <RequestInfoBlock label="電話" value={row.fromTeamPhone || "-"} />
            </div>
          </article>
        );
      })}

      <DetailDialogFrame open={activeTargetId !== null} onClose={closeDetail} dataTestId="hospital-request-detail-modal">
        {detailLoading ? <p className="ds-muted-panel rounded-xl p-4 text-sm text-slate-500">読み込み中...</p> : null}
        {detailError ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{detailError}</p> : null}
        {detail ? <HospitalRequestDetail detail={detail} consultTemplate={consultTemplate} /> : null}
      </DetailDialogFrame>

      <ConsultChatModal
        open={isConsultModalOpen}
        title="相談チャット"
        subtitle={consultTitle}
        status={consultCurrentStatus}
        messages={consultMessages}
        loading={consultLoading}
        error={consultError}
        note={consultNote}
        noteLabel="HP側コメント"
        notePlaceholder="A側へ送る相談内容を入力してください"
        sendButtonTestId="hospital-request-consult-send"
        sending={consultSending}
        canSend={Boolean(consultNote.trim())}
        onClose={() => closeConsult()}
        onChangeNote={setConsultNote}
        onSend={() => void sendConsult()}
        topActions={<><button type="button" disabled={consultSending} onClick={openNotAcceptableReasonDialog} className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.danger} h-9 rounded-lg px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60`}>受入不可を送信</button><button type="button" disabled={consultSending} onClick={() => setConsultDecisionConfirm("ACCEPTABLE")} className={`${BUTTON_BASE_CLASS} h-9 rounded-lg border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60`}>受入可能を送信</button></>}
        templateValue={consultTemplateSelection}
        templateOptions={consultTemplate.trim() ? [{ value: "", label: "テンプレートを選択" }, { value: "consult-template", label: "要相談テンプレート" }] : []}
        onTemplateChange={(value) => {
          setConsultTemplateSelection(value);
          if (value === "consult-template") setConsultNote(consultTemplate);
        }}
        confirmSection={consultDecisionConfirm ? <div className="ds-muted-panel rounded-lg px-3 py-2"><p className="text-sm text-slate-700">受入可能を送信しますか？</p><div className="mt-2 flex justify-end gap-2"><button type="button" disabled={consultSending} onClick={() => setConsultDecisionConfirm(null)} className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.secondary} h-8 rounded-lg px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60`}>キャンセル</button><button type="button" disabled={consultSending} onClick={() => void sendAcceptableFromConsult()} className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.primary} h-8 rounded-lg px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60`}>OK</button></div></div> : null}
      />

      <DecisionReasonDialog
        open={isNotAcceptableReasonOpen}
        title="受入不可理由を選択"
        description="受入不可を送信するには理由が必須です。"
        options={HOSPITAL_NOT_ACCEPTABLE_REASON_OPTIONS}
        value={notAcceptableReasonCode}
        textValue={notAcceptableReasonText}
        error={notAcceptableError}
        sending={consultSending}
        confirmLabel="受入不可を送信"
        tone="danger"
        onClose={() => setIsNotAcceptableReasonOpen(false)}
        onChangeValue={setNotAcceptableReasonCode}
        onChangeText={setNotAcceptableReasonText}
        onConfirm={() => void sendNotAcceptableFromConsult()}
      />

      {isSendCompleteModalOpen ? <div className="modal-shell-pad ds-dialog-backdrop"><div className="ds-dialog-surface relative w-full max-w-md p-6"><button type="button" onClick={closeSendCompleteModal} className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.secondary} absolute right-4 top-4 h-8 w-8 rounded-lg px-0 text-slate-600`} aria-label="閉じる"><XMarkIcon className="h-4 w-4" /></button><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">COMPLETED</p><h3 className="mt-2 text-lg font-bold text-slate-900">送信完了</h3><p className="mt-2 text-sm text-slate-700">{sendCompleteMessage}</p><p className="mt-1 text-sm text-slate-600">3秒後にモーダルを閉じます。</p></div></div> : null}

      {isPhoneCallModalOpen ? <div className="modal-shell-pad bg-slate-900/65"><div className="ds-dialog-surface w-full max-w-lg border-rose-200 p-6"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">CALL REQUIRED</p><h3 className="mt-2 text-xl font-bold text-slate-900">受入不可を送信しました</h3><p className="mt-2 text-sm text-slate-700">A隊へ電話連絡してください。</p><div className="ds-muted-panel mt-4 rounded-xl px-4 py-4 text-center"><p className="text-xs font-semibold text-slate-500">A隊電話番号</p><p className="mt-1 text-4xl font-extrabold tracking-wide text-rose-700">{phoneCallNumber}</p></div><div className="mt-5 flex justify-end"><button type="button" onClick={() => setIsPhoneCallModalOpen(false)} className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.danger} h-10 rounded-xl px-4 text-sm`}>電話連絡済み</button></div></div></div> : null}
    </div>
  );
}
