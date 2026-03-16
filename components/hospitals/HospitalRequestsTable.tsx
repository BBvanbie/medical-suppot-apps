"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { XMarkIcon } from "@heroicons/react/24/solid";

import { HospitalRequestDetail } from "@/components/hospitals/HospitalRequestDetail";
import { useHospitalRequestApi } from "@/components/hospitals/useHospitalRequestApi";
import { ConsultChatModal } from "@/components/shared/ConsultChatModal";
import { DecisionReasonDialog } from "@/components/shared/DecisionReasonDialog";
import { RequestStatusBadge } from "@/components/shared/RequestStatusBadge";
import { HOSPITAL_NOT_ACCEPTABLE_REASON_OPTIONS, type HospitalNotAcceptableReasonCode } from "@/lib/decisionReasons";
import { formatAwareDateYmd, formatDateTimeMdHm } from "@/lib/dateTimeFormat";

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
  if (level === "warning") return "bg-orange-50/70";
  if (level === "danger") return "bg-rose-100/70";
  if (level === "critical") return "bg-rose-200/80 font-bold text-slate-950";
  return "";
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
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
      <table className="w-full table-fixed text-sm" data-testid="hospital-requests-table">
        <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
          <tr>
            <th className="px-4 py-3">送信日時</th>
            <th className="px-4 py-3">事案ID</th>
            <th className="px-4 py-3">覚知日時</th>
            <th className="px-4 py-3">現場住所</th>
            <th className="px-4 py-3">送信元救急隊</th>
            <th className="px-4 py-3">選定科目</th>
            <th className="px-4 py-3">ステータス</th>
            <th className="px-4 py-3" aria-label="detail action" />
          </tr>
        </thead>
        <tbody>
          {normalizedRows.length === 0 ? (
            <tr>
              <td className="px-4 py-8 text-sm text-slate-500" colSpan={8}>受入要請はまだありません。</td>
            </tr>
          ) : null}
          {normalizedRows.map((row) => {
            const attentionLevel = getRequestAttentionLevel(row.status, row.openedAt, nowTs);
            return (
              <tr key={row.targetId} className={`border-t border-slate-100 ${getRequestAttentionRowClass(attentionLevel)}`} data-testid="hospital-request-row" data-target-id={row.targetId}>
                <td className="px-4 py-3 text-slate-700">{row.sentAtLabel}</td>
                <td className="px-4 py-3 font-semibold text-slate-700">{row.caseId}</td>
                <td className="px-4 py-3 text-slate-700">{[formatAwareDateYmd(row.awareDate), row.awareTime].filter(Boolean).join(" ") || "-"}</td>
                <td className="px-4 py-3 text-slate-700">{row.dispatchAddress || "-"}</td>
                <td className="px-4 py-3 text-slate-700">{row.fromTeamName ?? "-"}{row.fromTeamCode ? <span className="ml-2 text-xs text-slate-500">({row.fromTeamCode})</span> : null}</td>
                <td className="px-4 py-3 text-slate-700">{row.selectedDepartments.join(", ") || "-"}</td>
                <td className="px-4 py-3"><RequestStatusBadge status={row.status} /></td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-2">
                    <button type="button" data-testid="hospital-request-detail-button" data-target-id={row.targetId} onClick={() => void openDetail(row.targetId)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700"><span>詳細</span></button>
                    {row.status === "NEGOTIATING" ? <button type="button" data-testid="hospital-request-consult-button" data-target-id={row.targetId} onClick={() => void openConsult(row)} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"><span>相談</span></button> : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {activeTargetId !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4 py-6" onClick={closeDetail} data-testid="hospital-request-detail-modal">
          <div className="flex max-h-[92vh] w-full max-w-[1180px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[var(--dashboard-bg)] p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-3 flex items-center justify-end border-b border-slate-200 bg-[var(--dashboard-bg)] px-4 py-3">
              <button type="button" onClick={closeDetail} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50" aria-label="閉じる"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              {detailLoading ? <p className="rounded-xl bg-white p-4 text-sm text-slate-500">読み込み中...</p> : null}
              {detailError ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{detailError}</p> : null}
              {detail ? <HospitalRequestDetail detail={detail} consultTemplate={consultTemplate} /> : null}
            </div>
          </div>
        </div>
      ) : null}

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
        topActions={<><button type="button" disabled={consultSending} onClick={openNotAcceptableReasonDialog} className="inline-flex h-9 items-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60">受入不可を送信</button><button type="button" disabled={consultSending} onClick={() => setConsultDecisionConfirm("ACCEPTABLE")} className="inline-flex h-9 items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60">受入可能を送信</button></>}
        templateValue={consultTemplateSelection}
        templateOptions={consultTemplate.trim() ? [{ value: "", label: "テンプレートを選択" }, { value: "consult-template", label: "要相談テンプレート" }] : []}
        onTemplateChange={(value) => {
          setConsultTemplateSelection(value);
          if (value === "consult-template") setConsultNote(consultTemplate);
        }}
        confirmSection={consultDecisionConfirm ? <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><p className="text-sm text-slate-700">受入可能を送信しますか？</p><div className="mt-2 flex justify-end gap-2"><button type="button" disabled={consultSending} onClick={() => setConsultDecisionConfirm(null)} className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60">キャンセル</button><button type="button" disabled={consultSending} onClick={() => void sendAcceptableFromConsult()} className="inline-flex h-8 items-center rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60">OK</button></div></div> : null}
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

      {isSendCompleteModalOpen ? <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4 py-6"><div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"><button type="button" onClick={closeSendCompleteModal} className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50" aria-label="閉じる"><XMarkIcon className="h-4 w-4" /></button><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">COMPLETED</p><h3 className="mt-2 text-lg font-bold text-slate-900">送信完了</h3><p className="mt-2 text-sm text-slate-700">{sendCompleteMessage}</p><p className="mt-1 text-sm text-slate-600">3秒後にモーダルを閉じます。</p></div></div> : null}

      {isPhoneCallModalOpen ? <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/65 px-4 py-6"><div className="w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">CALL REQUIRED</p><h3 className="mt-2 text-xl font-bold text-slate-900">受入不可を送信しました</h3><p className="mt-2 text-sm text-slate-700">A隊へ電話連絡してください。</p><div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-center"><p className="text-xs font-semibold text-slate-500">A隊電話番号</p><p className="mt-1 text-4xl font-extrabold tracking-wide text-rose-700">{phoneCallNumber}</p></div><div className="mt-5 flex justify-end"><button type="button" onClick={() => setIsPhoneCallModalOpen(false)} className="inline-flex h-10 items-center rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700">電話連絡済み</button></div></div></div> : null}
    </div>
  );
}



