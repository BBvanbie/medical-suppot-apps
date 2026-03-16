"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { XMarkIcon } from "@heroicons/react/24/solid";

import { DecisionReasonDialog } from "@/components/shared/DecisionReasonDialog";
import { ConsultChatModal } from "@/components/shared/ConsultChatModal";
import { PatientSummaryPanel } from "@/components/shared/PatientSummaryPanel";
import { RequestStatusBadge } from "@/components/shared/RequestStatusBadge";
import { HOSPITAL_NOT_ACCEPTABLE_REASON_OPTIONS, type HospitalNotAcceptableReasonCode } from "@/lib/decisionReasons";
import { formatDateTimeMdHm } from "@/lib/dateTimeFormat";

type RequestDetail = {
  targetId: number;
  requestId: string;
  caseId: string;
  sentAt: string;
  awareDate?: string;
  awareTime?: string;
  dispatchAddress?: string;
  status: string;
  statusLabel: string;
  openedAt: string | null;
  patientSummary: Record<string, unknown> | null;
  selectedDepartments: string[];
  fromTeamCode: string | null;
  fromTeamName: string | null;
  fromTeamPhone?: string | null;
  consultComment?: string | null;
  emsReplyComment?: string | null;
};

type HospitalRequestDetailProps = {
  detail: RequestDetail;
  showStatusSection?: boolean;
  showBottomNotAcceptableAction?: boolean;
  forcePhoneCallOnNotAcceptable?: boolean;
  consultTemplate?: string;
};

type AcceptModalPhase = "confirm" | "sending" | "success" | "error";
type ConsultMessage = {
  id: number;
  actor: "HP" | "A";
  actedAt: string;
  note: string;
};

type NotAcceptableContext = "status" | "consult";

const nextActions = [
  { label: "受入可能", status: "ACCEPTABLE" },
  { label: "受入不可", status: "NOT_ACCEPTABLE" },
  { label: "要相談", status: "NEGOTIATING" },
] as const;

const actionButtonClassMap: Record<(typeof nextActions)[number]["status"], string> = {
  ACCEPTABLE:
    "inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-60",
  NOT_ACCEPTABLE:
    "inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60",
  NEGOTIATING:
    "inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-60",
};

function asText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

export function HospitalRequestDetail({
  detail,
  showStatusSection = true,
  showBottomNotAcceptableAction = false,
  forcePhoneCallOnNotAcceptable = false,
  consultTemplate = "",
}: HospitalRequestDetailProps) {
  const router = useRouter();
  const [status, setStatus] = useState(detail.status);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [acceptModalPhase, setAcceptModalPhase] = useState<AcceptModalPhase>("confirm");
  const [acceptModalError, setAcceptModalError] = useState<string | null>(null);
  const [isConsultChatOpen, setIsConsultChatOpen] = useState(false);
  const [consultMessages, setConsultMessages] = useState<ConsultMessage[]>([]);
  const [consultLoading, setConsultLoading] = useState(false);
  const [consultSending, setConsultSending] = useState(false);
  const [consultError, setConsultError] = useState<string | null>(null);
  const [consultNote, setConsultNote] = useState("");
  const [consultDecisionConfirm, setConsultDecisionConfirm] = useState<"ACCEPTABLE" | null>(null);
  const [consultTemplateSelection, setConsultTemplateSelection] = useState("");
  const [notAcceptableContext, setNotAcceptableContext] = useState<NotAcceptableContext>("status");
  const [isNotAcceptableReasonOpen, setIsNotAcceptableReasonOpen] = useState(false);
  const [notAcceptableReasonCode, setNotAcceptableReasonCode] = useState<HospitalNotAcceptableReasonCode | "">("");
  const [notAcceptableReasonText, setNotAcceptableReasonText] = useState("");
  const [notAcceptableError, setNotAcceptableError] = useState("");
  const [isPhoneCallModalOpen, setIsPhoneCallModalOpen] = useState(false);
  const [phoneCallNumber, setPhoneCallNumber] = useState("");
  const [isSendCompleteModalOpen, setIsSendCompleteModalOpen] = useState(false);
  const [sendCompleteMessage, setSendCompleteMessage] = useState("");
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sentAtLabel = Number.isNaN(new Date(detail.sentAt).getTime()) ? detail.sentAt : formatDateTimeMdHm(detail.sentAt);
  const awareDateTimeLabel = [detail.awareDate, detail.awareTime].filter(Boolean).join(" ") || "-";

  const summary = detail.patientSummary ?? {};
  const senderNameFallback = asText(summary.teamName) === "-" ? null : asText(summary.teamName);
  const senderCodeFallback = asText(summary.teamCode) === "-" ? null : asText(summary.teamCode);
  const senderName = detail.fromTeamName ?? senderNameFallback ?? "-";
  const senderCode = detail.fromTeamCode ?? senderCodeFallback ?? null;
  const senderPhone = detail.fromTeamPhone ?? null;

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  async function updateStatus(
    nextStatus: (typeof nextActions)[number]["status"],
    note?: string,
    reason?: { reasonCode?: string; reasonText?: string },
  ) {
    setIsPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/hospitals/requests/${detail.targetId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          note: note ?? null,
          reasonCode: reason?.reasonCode,
          reasonText: reason?.reasonText,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        const message = data?.message ?? "状態更新に失敗しました。";
        setError(message);
        return { ok: false as const, message };
      }
      const data = (await res.json()) as { status: string };
      setStatus(data.status);
      router.refresh();
      return { ok: true as const };
    } catch {
      const message = "状態更新に失敗しました。";
      setError(message);
      return { ok: false as const, message };
    } finally {
      setIsPending(false);
    }
  }

  function startRedirectToList() {
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    redirectTimerRef.current = setTimeout(() => {
      setIsAcceptModalOpen(false);
      setAcceptModalPhase("confirm");
      setIsSendCompleteModalOpen(false);
      setSendCompleteMessage("");
      closeConsultChat(true);
      router.refresh();
    }, 3000);
  }

  function openSendCompleteModal(message: string) {
    setSendCompleteMessage(message);
    setIsSendCompleteModalOpen(true);
    startRedirectToList();
  }

  function closeSendCompleteModal() {
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
    setIsSendCompleteModalOpen(false);
    setSendCompleteMessage("");
  }

  async function handleAcceptConfirm() {
    setAcceptModalPhase("sending");
    setAcceptModalError(null);
    const result = await updateStatus("ACCEPTABLE");
    if (!result.ok) {
      setAcceptModalPhase("error");
      setAcceptModalError(result.message ?? "状態更新に失敗しました。");
      return;
    }
    setAcceptModalPhase("success");
    startRedirectToList();
  }

  function closeAcceptModal() {
    if (acceptModalPhase === "sending") return;
    setIsAcceptModalOpen(false);
    setAcceptModalError(null);
    setAcceptModalPhase("confirm");
  }

  function openNotAcceptableReasonDialog(context: NotAcceptableContext) {
    setNotAcceptableContext(context);
    setNotAcceptableReasonCode("");
    setNotAcceptableReasonText("");
    setNotAcceptableError("");
    setIsNotAcceptableReasonOpen(true);
  }

  function closeNotAcceptableReasonDialog() {
    if (isPending || consultSending) return;
    setIsNotAcceptableReasonOpen(false);
    setNotAcceptableError("");
  }

  async function confirmNotAcceptableReason() {
    const reason = {
      reasonCode: notAcceptableReasonCode,
      reasonText: notAcceptableReasonText,
    };

    if (notAcceptableContext === "consult") {
      if (consultSending) return;
      setConsultSending(true);
      setConsultError(null);
      const requiresPhoneCall = status === "ACCEPTABLE" || status === "TRANSPORT_DECIDED";
      const result = await updateStatus("NOT_ACCEPTABLE", undefined, reason);
      if (!result.ok) {
        setNotAcceptableError(result.message ?? "受入不可送信に失敗しました。");
        setConsultSending(false);
        return;
      }
      setIsNotAcceptableReasonOpen(false);
      setConsultDecisionConfirm(null);
      if (requiresPhoneCall) {
        setPhoneCallNumber(senderPhone?.trim() ? senderPhone : "-");
        closeConsultChat(true);
        setIsPhoneCallModalOpen(true);
      } else {
        closeConsultChat(true);
        openSendCompleteModal("受入不可を送信しました。");
      }
      setConsultSending(false);
      return;
    }

    const requiresPhoneCall = status === "ACCEPTABLE" || status === "TRANSPORT_DECIDED";
    const result = await updateStatus("NOT_ACCEPTABLE", undefined, reason);
    if (!result.ok) {
      setNotAcceptableError(result.message ?? "受入不可送信に失敗しました。");
      return;
    }
    setIsNotAcceptableReasonOpen(false);
    if (requiresPhoneCall || forcePhoneCallOnNotAcceptable) {
      setPhoneCallNumber(senderPhone?.trim() ? senderPhone : "-");
      setIsPhoneCallModalOpen(true);
      return;
    }
    openSendCompleteModal("受入不可を送信しました。");
  }

  async function fetchConsultMessages() {
    setConsultLoading(true);
    setConsultError(null);
    try {
      const res = await fetch(`/api/hospitals/requests/${detail.targetId}/consult`);
      const data = (await res.json()) as { messages?: ConsultMessage[]; message?: string };
      if (!res.ok) {
        throw new Error(data.message ?? "相談履歴の取得に失敗しました。");
      }
      setConsultMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (e) {
      setConsultMessages([]);
      setConsultError(e instanceof Error ? e.message : "相談履歴の取得に失敗しました。");
    } finally {
      setConsultLoading(false);
    }
  }

  async function openConsultChat() {
    setConsultNote("");
    setConsultError(null);
    setConsultDecisionConfirm(null);
    setConsultTemplateSelection("");
    setIsConsultChatOpen(true);
    await fetchConsultMessages();
  }

  function closeConsultChat(force = false) {
    if (consultSending && !force) return;
    setIsConsultChatOpen(false);
    setConsultDecisionConfirm(null);
    setConsultTemplateSelection("");
    setConsultError(null);
  }

  async function sendConsultMessage() {
    if (!consultNote.trim() || consultSending) return;
    setConsultSending(true);
    setConsultError(null);
    const result = await updateStatus("NEGOTIATING", consultNote.trim());
    if (!result.ok) {
      setConsultError(result.message ?? "相談送信に失敗しました。");
      setConsultSending(false);
      return;
    }
    setConsultNote("");
    setConsultTemplateSelection("");
    await fetchConsultMessages();
    setConsultSending(false);
  }

  async function sendDecisionFromConsult(nextStatus: "ACCEPTABLE") {
    if (consultSending) return;
    setConsultSending(true);
    setConsultError(null);
    const result = await updateStatus(nextStatus);
    if (!result.ok) {
      setConsultError(result.message ?? "状態更新に失敗しました。");
      setConsultSending(false);
      return;
    }
    setConsultDecisionConfirm(null);
    await fetchConsultMessages();
    openSendCompleteModal("受入可能を送信しました。");
    setConsultSending(false);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">REQUEST DETAIL</p>
        <h2 className="mt-2 text-lg font-bold text-slate-900">受入依頼詳細</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-700 md:grid-cols-2">
          <p>依頼ID: <span className="font-semibold">{detail.requestId}</span></p>
          <p>事案ID: <span className="font-semibold">{detail.caseId}</span></p>
          <p>覚知日時: <span className="font-semibold">{awareDateTimeLabel}</span></p>
          <p>現場住所: <span className="font-semibold">{asText(detail.dispatchAddress)}</span></p>
          <p>送信日時: <span className="font-semibold">{sentAtLabel}</span></p>
          <p>
            送信救急隊: <span className="font-semibold">{senderName}</span>
            {senderCode ? ` (${senderCode})` : ""}
          </p>
        </div>
        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-500">選択診療科</p>
          <p className="mt-1 text-sm text-slate-700">{detail.selectedDepartments.join(", ") || "-"}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">PATIENT SUMMARY</p>
        <PatientSummaryPanel className="mt-4" caseId={detail.caseId} summary={summary} />
      </section>

      {showStatusSection ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">STATUS</p>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-700">
            <span>現在状態</span>
            <RequestStatusBadge status={status} />
          </div>
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <p>要相談コメント <span className="font-semibold">{detail.consultComment?.trim() ? detail.consultComment : "-"}</span></p>
            <p className="mt-1">A側回答 <span className="font-semibold">{detail.emsReplyComment?.trim() ? detail.emsReplyComment : "-"}</span></p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {nextActions.map((action) => (
              <button
                key={action.status}
                type="button"
                data-testid={`hospital-status-action-${action.status.toLowerCase()}`}
                disabled={isPending || (status === action.status && action.status !== "NEGOTIATING")}
                onClick={() => {
                  if (action.status === "ACCEPTABLE") {
                    setIsAcceptModalOpen(true);
                    return;
                  }
                  if (action.status === "NOT_ACCEPTABLE") {
                    openNotAcceptableReasonDialog("status");
                    return;
                  }
                  void openConsultChat();
                }}
                className={actionButtonClassMap[action.status]}
              >
                {action.label}
              </button>
            ))}
          </div>
          {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
        </section>
      ) : null}

      {showBottomNotAcceptableAction ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">ACTION</p>
              <p className="mt-1 text-sm text-slate-700">受入不可へ戻す場合は、送信後にA隊への電話連絡が必須です。</p>
            </div>
            <button
              type="button"
              disabled={isPending}
              onClick={() => openNotAcceptableReasonDialog("status")}
              className="inline-flex h-10 items-center rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              受入不可を送信
            </button>
          </div>
        </section>
      ) : null}

      {showStatusSection && isAcceptModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl" data-testid="hospital-accept-modal">
            {acceptModalPhase === "confirm" ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">CONFIRM</p>
                <h3 className="mt-2 text-lg font-bold text-slate-900">受入可能を送信しますか？</h3>
                <p className="mt-2 text-sm text-slate-600">OKを押すと受入可能をA側へ送信します。</p>
                <div className="mt-5 flex justify-end gap-2">
                  <button type="button" onClick={closeAcceptModal} className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300">キャンセル</button>
                  <button type="button" data-testid="hospital-accept-confirm-ok" onClick={() => void handleAcceptConfirm()} className="inline-flex h-10 items-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700">OK</button>
                </div>
              </>
            ) : null}
            {acceptModalPhase === "sending" ? <><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">SENDING</p><h3 className="mt-2 text-lg font-bold text-slate-900">送信中...</h3></> : null}
            {acceptModalPhase === "success" ? <><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">COMPLETED</p><h3 className="mt-2 text-lg font-bold text-slate-900">送信完了</h3><p className="mt-2 text-sm text-slate-600">3秒後にモーダルを閉じます。</p></> : null}
            {acceptModalPhase === "error" ? <><p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">ERROR</p><h3 className="mt-2 text-lg font-bold text-slate-900">送信に失敗しました</h3><p className="mt-2 text-sm text-rose-700">{acceptModalError ?? "状態更新に失敗しました。"}</p></> : null}
          </div>
        </div>
      ) : null}

      <ConsultChatModal
        open={showStatusSection && isConsultChatOpen}
        title="相談チャット"
        subtitle={`${detail.caseId} / ${detail.requestId}`}
        status={status}
        messages={consultMessages}
        loading={consultLoading}
        error={consultError ?? ""}
        note={consultNote}
        noteLabel="HP側コメント"
        notePlaceholder="A側へ送る相談内容を入力してください"
        sendButtonTestId="hospital-consult-send"
        sending={consultSending}
        canSend={Boolean(consultNote.trim())}
        onClose={() => closeConsultChat()}
        onChangeNote={setConsultNote}
        onSend={() => void sendConsultMessage()}
        topActions={
          <>
            <button type="button" disabled={consultSending} onClick={() => openNotAcceptableReasonDialog("consult")} className="inline-flex h-9 items-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60">受入不可を送信</button>
            <button type="button" disabled={consultSending} onClick={() => setConsultDecisionConfirm("ACCEPTABLE")} className="inline-flex h-9 items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60">受入可能を送信</button>
          </>
        }
        templateValue={consultTemplateSelection}
        templateOptions={consultTemplate.trim() ? [{ value: "", label: "テンプレートを選択" }, { value: "consult-template", label: "要相談テンプレート" }] : []}
        onTemplateChange={(value) => {
          setConsultTemplateSelection(value);
          if (value === "consult-template") setConsultNote(consultTemplate);
        }}
        confirmSection={
          consultDecisionConfirm ? (
            <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-sm text-slate-700">受入可能を送信しますか？</p>
              <div className="mt-2 flex justify-end gap-2">
                <button type="button" disabled={consultSending} onClick={() => setConsultDecisionConfirm(null)} className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60">キャンセル</button>
                <button type="button" disabled={consultSending} onClick={() => void sendDecisionFromConsult("ACCEPTABLE")} className="inline-flex h-8 items-center rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60">OK</button>
              </div>
            </div>
          ) : null
        }
      />

      <DecisionReasonDialog
        open={isNotAcceptableReasonOpen}
        title="受入不可理由を選択"
        description="受入不可を送信するには理由が必須です。"
        options={HOSPITAL_NOT_ACCEPTABLE_REASON_OPTIONS}
        value={notAcceptableReasonCode}
        textValue={notAcceptableReasonText}
        error={notAcceptableError}
        sending={isPending || consultSending}
        confirmLabel="受入不可を送信"
        tone="danger"
        onClose={closeNotAcceptableReasonDialog}
        onChangeValue={setNotAcceptableReasonCode}
        onChangeText={setNotAcceptableReasonText}
        onConfirm={() => void confirmNotAcceptableReason()}
      />

      {showStatusSection && isSendCompleteModalOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4 py-6">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" data-testid="hospital-send-complete-modal">
            <button type="button" onClick={closeSendCompleteModal} className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50" aria-label="閉じる"><XMarkIcon className="h-4 w-4" /></button>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">COMPLETED</p>
            <h3 className="mt-2 text-lg font-bold text-slate-900">送信完了</h3>
            <p className="mt-2 text-sm text-slate-700">{sendCompleteMessage}</p>
            <p className="mt-1 text-sm text-slate-600">3秒後にモーダルを閉じます。</p>
          </div>
        </div>
      ) : null}

      {isPhoneCallModalOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/65 px-4 py-6">
          <div className="w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">CALL REQUIRED</p>
            <h3 className="mt-2 text-xl font-bold text-slate-900">受入不可を送信しました</h3>
            <p className="mt-2 text-sm text-slate-700">A隊へ電話連絡してください。</p>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-center">
              <p className="text-xs font-semibold text-slate-500">A隊電話番号</p>
              <p className="mt-1 text-4xl font-extrabold tracking-wide text-rose-700">{phoneCallNumber}</p>
            </div>
            <div className="mt-5 flex justify-end">
              <button type="button" onClick={() => setIsPhoneCallModalOpen(false)} className="inline-flex h-10 items-center rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700">電話連絡済み</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}



