"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";

import { PatientSummaryPanel } from "@/components/shared/PatientSummaryPanel";
import { RequestStatusBadge } from "@/components/shared/RequestStatusBadge";
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
};

type AcceptModalPhase = "confirm" | "sending" | "success" | "error";
type NotAcceptableModalPhase = "confirm" | "sending" | "success" | "error";
type ConsultMessage = {
  id: number;
  actor: "HP" | "A";
  actedAt: string;
  note: string;
};

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
}: HospitalRequestDetailProps) {
  const router = useRouter();
  const [status, setStatus] = useState(detail.status);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [acceptModalPhase, setAcceptModalPhase] = useState<AcceptModalPhase>("confirm");
  const [acceptModalError, setAcceptModalError] = useState<string | null>(null);
  const [isNotAcceptableModalOpen, setIsNotAcceptableModalOpen] = useState(false);
  const [notAcceptableModalPhase, setNotAcceptableModalPhase] = useState<NotAcceptableModalPhase>("confirm");
  const [notAcceptableModalError, setNotAcceptableModalError] = useState<string | null>(null);
  const [isConsultChatOpen, setIsConsultChatOpen] = useState(false);
  const [consultMessages, setConsultMessages] = useState<ConsultMessage[]>([]);
  const [consultLoading, setConsultLoading] = useState(false);
  const [consultSending, setConsultSending] = useState(false);
  const [consultError, setConsultError] = useState<string | null>(null);
  const [consultNote, setConsultNote] = useState("");
  const [consultDecisionConfirm, setConsultDecisionConfirm] = useState<"ACCEPTABLE" | "NOT_ACCEPTABLE" | null>(null);
  const [isPhoneCallModalOpen, setIsPhoneCallModalOpen] = useState(false);
  const [phoneCallNumber, setPhoneCallNumber] = useState("");
  const [isSendCompleteModalOpen, setIsSendCompleteModalOpen] = useState(false);
  const [sendCompleteMessage, setSendCompleteMessage] = useState("");
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sentAtLabel = Number.isNaN(new Date(detail.sentAt).getTime())
    ? detail.sentAt
    : formatDateTimeMdHm(detail.sentAt);
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

  async function updateStatus(nextStatus: (typeof nextActions)[number]["status"], note?: string) {
    setIsPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/hospitals/requests/${detail.targetId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, note: note ?? null }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        const message = data?.message ?? "状態更新に失敗しました。";
        setError(message);
        return { ok: false, message };
      }
      const data = (await res.json()) as { status: string; statusLabel: string };
      setStatus(data.status);
      router.refresh();
      return { ok: true as const };
    } catch {
      const message = "状態更新に失敗しました。";
      setError(message);
      return { ok: false, message };
    } finally {
      setIsPending(false);
    }
  }

  function startRedirectToList() {
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    redirectTimerRef.current = setTimeout(() => {
      setIsAcceptModalOpen(false);
      setAcceptModalPhase("confirm");
      setIsNotAcceptableModalOpen(false);
      setNotAcceptableModalPhase("confirm");
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
    if (!result?.ok) {
      setAcceptModalPhase("error");
      setAcceptModalError(result?.message ?? "状態更新に失敗しました。");
      return;
    }
    setAcceptModalPhase("success");
    startRedirectToList();
  }

  function openAcceptModal() {
    setAcceptModalError(null);
    setAcceptModalPhase("confirm");
    setIsAcceptModalOpen(true);
  }

  function closeAcceptModal() {
    if (acceptModalPhase === "sending") return;
    setIsAcceptModalOpen(false);
    setAcceptModalError(null);
    setAcceptModalPhase("confirm");
  }

  async function handleNotAcceptableConfirm() {
    const fromAcceptable = status === "ACCEPTABLE";
    setNotAcceptableModalPhase("sending");
    setNotAcceptableModalError(null);
    const result = await updateStatus("NOT_ACCEPTABLE");
    if (!result?.ok) {
      setNotAcceptableModalPhase("error");
      setNotAcceptableModalError(result?.message ?? "状態更新に失敗しました。");
      return;
    }
    if (fromAcceptable || forcePhoneCallOnNotAcceptable) {
      setPhoneCallNumber(senderPhone?.trim() ? senderPhone : "-");
      setIsNotAcceptableModalOpen(false);
      setNotAcceptableModalPhase("confirm");
      setIsPhoneCallModalOpen(true);
      return;
    }
    setNotAcceptableModalPhase("success");
    startRedirectToList();
  }

  function openNotAcceptableModal() {
    setNotAcceptableModalError(null);
    setNotAcceptableModalPhase("confirm");
    setIsNotAcceptableModalOpen(true);
  }

  function closeNotAcceptableModal() {
    if (notAcceptableModalPhase === "sending") return;
    setIsNotAcceptableModalOpen(false);
    setNotAcceptableModalError(null);
    setNotAcceptableModalPhase("confirm");
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
    setIsConsultChatOpen(true);
    await fetchConsultMessages();
  }

  function closeConsultChat(force = false) {
    if (consultSending && !force) return;
    setIsConsultChatOpen(false);
    setConsultDecisionConfirm(null);
    setConsultError(null);
  }

  async function sendConsultMessage() {
    if (!consultNote.trim() || consultSending) return;
    setConsultSending(true);
    setConsultError(null);
    const result = await updateStatus("NEGOTIATING", consultNote.trim());
    if (!result?.ok) {
      setConsultError(result?.message ?? "相談送信に失敗しました。");
      setConsultSending(false);
      return;
    }
    setConsultNote("");
    await fetchConsultMessages();
    setConsultSending(false);
  }

  async function sendDecisionFromConsult(nextStatus: "ACCEPTABLE" | "NOT_ACCEPTABLE") {
    if (consultSending) return;
    setConsultSending(true);
    setConsultError(null);
    const fromAcceptable = status === "ACCEPTABLE";
    const result = await updateStatus(nextStatus);
    if (!result?.ok) {
      setConsultError(result?.message ?? "状態更新に失敗しました。");
      setConsultSending(false);
      return;
    }
    setConsultDecisionConfirm(null);
    if (nextStatus === "ACCEPTABLE") {
      await fetchConsultMessages();
      openSendCompleteModal("受入可能を送信しました。");
      setConsultSending(false);
      return;
    }
    if (fromAcceptable && nextStatus === "NOT_ACCEPTABLE") {
      setPhoneCallNumber(senderPhone?.trim() ? senderPhone : "-");
      closeConsultChat(true);
      setIsPhoneCallModalOpen(true);
      setConsultSending(false);
      return;
    }
    closeConsultChat(true);
    openSendCompleteModal("受入不可を送信しました。");
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
          <p>覚知日時 <span className="font-semibold">{awareDateTimeLabel}</span></p>
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
          <p>
            要相談コメント <span className="font-semibold">{detail.consultComment?.trim() ? detail.consultComment : "-"}</span>
          </p>
          <p className="mt-1">
            A側回答 <span className="font-semibold">{detail.emsReplyComment?.trim() ? detail.emsReplyComment : "-"}</span>
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {nextActions.map((action) => (
            <button
              key={action.status}
              type="button"
              disabled={
                isPending ||
                (status === action.status && action.status !== "NEGOTIATING")
              }
              onClick={() => {
                if (action.status === "ACCEPTABLE") {
                  openAcceptModal();
                  return;
                }
                if (action.status === "NOT_ACCEPTABLE") {
                  openNotAcceptableModal();
                  return;
                }
                if (action.status === "NEGOTIATING") {
                  void openConsultChat();
                  return;
                }
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
              <p className="mt-1 text-sm text-slate-700">受入不可を送信する場合、送信後に救急隊への電話連絡が必須です。</p>
            </div>
            <button
              type="button"
              disabled={isPending}
              onClick={openNotAcceptableModal}
              className="inline-flex h-10 items-center rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              受入不可を送信
            </button>
          </div>
        </section>
      ) : null}

      {showStatusSection && isAcceptModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            {acceptModalPhase === "confirm" ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">CONFIRM</p>
                <h3 className="mt-2 text-lg font-bold text-slate-900">受入可能送信しますか？</h3>
                <p className="mt-2 text-sm text-slate-600">OKを押すと受入可能をA側へ送信します。</p>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeAcceptModal}
                    className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleAcceptConfirm()}
                    className="inline-flex h-10 items-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    OK
                  </button>
                </div>
              </>
            ) : null}

            {acceptModalPhase === "sending" ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">SENDING</p>
                <h3 className="mt-2 text-lg font-bold text-slate-900">送信中...</h3>
              </>
            ) : null}

            {acceptModalPhase === "success" ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">COMPLETED</p>
                <button
                  type="button"
                  onClick={() => {
                    if (redirectTimerRef.current) {
                      clearTimeout(redirectTimerRef.current);
                      redirectTimerRef.current = null;
                    }
                    closeAcceptModal();
                  }}
                  className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                  aria-label="閉じる"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
                <h3 className="mt-2 text-lg font-bold text-slate-900">送信完了</h3>
                <p className="mt-2 text-sm text-slate-600">3秒後にモーダルを閉じます。</p>
                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (redirectTimerRef.current) {
                        clearTimeout(redirectTimerRef.current);
                        redirectTimerRef.current = null;
                      }
                      closeAcceptModal();
                    }}
                    className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                  >
                    閉じる
                  </button>
                </div>
              </>
            ) : null}

            {acceptModalPhase === "error" ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">ERROR</p>
                <h3 className="mt-2 text-lg font-bold text-slate-900">送信に失敗しました</h3>
                <p className="mt-2 text-sm text-rose-700">{acceptModalError ?? "状態更新に失敗しました。"}</p>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeAcceptModal}
                    className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                  >
                    閉じる                  </button>
                  <button
                    type="button"
                    onClick={() => void handleAcceptConfirm()}
                    className="inline-flex h-10 items-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    再送                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {isNotAcceptableModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            {notAcceptableModalPhase === "confirm" ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">CONFIRM</p>
                <h3 className="mt-2 text-lg font-bold text-slate-900">受入不可送信しますか？</h3>
                <p className="mt-2 text-sm text-slate-600">OKを押すと受入不可をA側へ送信します。</p>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeNotAcceptableModal}
                    className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleNotAcceptableConfirm()}
                    className="inline-flex h-10 items-center rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700"
                  >
                    OK
                  </button>
                </div>
              </>
            ) : null}

            {notAcceptableModalPhase === "sending" ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">SENDING</p>
                <h3 className="mt-2 text-lg font-bold text-slate-900">送信中...</h3>
              </>
            ) : null}

            {notAcceptableModalPhase === "success" ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">COMPLETED</p>
                <button
                  type="button"
                  onClick={() => {
                    if (redirectTimerRef.current) {
                      clearTimeout(redirectTimerRef.current);
                      redirectTimerRef.current = null;
                    }
                    closeNotAcceptableModal();
                  }}
                  className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                  aria-label="閉じる"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
                <h3 className="mt-2 text-lg font-bold text-slate-900">送信完了</h3>
                <p className="mt-2 text-sm text-slate-600">3秒後にモーダルを閉じます。</p>
                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (redirectTimerRef.current) {
                        clearTimeout(redirectTimerRef.current);
                        redirectTimerRef.current = null;
                      }
                      closeNotAcceptableModal();
                    }}
                    className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                  >
                    閉じる
                  </button>
                </div>
              </>
            ) : null}

            {notAcceptableModalPhase === "error" ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">ERROR</p>
                <h3 className="mt-2 text-lg font-bold text-slate-900">送信に失敗しました</h3>
                <p className="mt-2 text-sm text-rose-700">{notAcceptableModalError ?? "状態更新に失敗しました。"}</p>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeNotAcceptableModal}
                    className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                  >
                    閉じる                  </button>
                  <button
                    type="button"
                    onClick={() => void handleNotAcceptableConfirm()}
                    className="inline-flex h-10 items-center rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700"
                  >
                    再送                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {showStatusSection && isConsultChatOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4 py-6" onClick={() => closeConsultChat()}>
          <div
            className="flex h-[78vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">CONSULT CHAT</p>
                <h3 className="mt-1 text-base font-bold text-slate-900">相談チャット</h3>
                <p className="text-xs text-slate-500">{detail.caseId} / {detail.requestId}</p>
                <div className="mt-2">
                  <RequestStatusBadge status={status} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => closeConsultChat()}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                aria-label="閉じる"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-slate-50 px-4 py-4">
              {consultLoading ? <p className="text-sm text-slate-500">読み込み中...</p> : null}
              {!consultLoading && consultMessages.length === 0 ? <p className="text-sm text-slate-500">相談履歴はまだありません。</p> : null}
              {!consultLoading ? (
                <div className="space-y-3">
                  {consultMessages.map((message) => {
                    const fromHp = message.actor === "HP";
                    return (
                      <div key={message.id} className={`flex ${fromHp ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm shadow-sm ${fromHp ? "bg-blue-600 text-white" : "bg-white text-slate-800"}`}>
                          <p className={`text-[11px] font-semibold ${fromHp ? "text-blue-100" : "text-slate-500"}`}>
                            {fromHp ? "HP側" : "A側"} / {formatDateTimeMdHm(message.actedAt)}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap break-words">{message.note}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <div className="border-t border-slate-200 bg-white px-4 py-3">
              <div className="mb-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={consultSending}
                  onClick={() => setConsultDecisionConfirm("NOT_ACCEPTABLE")}
                  className="inline-flex h-9 items-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  受入不可を送信
                </button>
                <button
                  type="button"
                  disabled={consultSending}
                  onClick={() => setConsultDecisionConfirm("ACCEPTABLE")}
                  className="inline-flex h-9 items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  受入可能を送信
                </button>
              </div>
              {consultDecisionConfirm ? (
                <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-sm text-slate-700">
                    {consultDecisionConfirm === "ACCEPTABLE" ? "受入可能を送信しますか？" : "受入不可を送信しますか？"}
                  </p>
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={consultSending}
                      onClick={() => setConsultDecisionConfirm(null)}
                      className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      キャンセル
                    </button>
                    <button
                      type="button"
                      disabled={consultSending}
                      onClick={() => void sendDecisionFromConsult(consultDecisionConfirm)}
                      className="inline-flex h-8 items-center rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      OK
                    </button>
                  </div>
                </div>
              ) : null}
              <label className="block">
                <span className="text-xs font-semibold text-slate-500">HP側コメント</span>
                <textarea
                  value={consultNote}
                  onChange={(e) => setConsultNote(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="A側へ送る相談内容を入力してください"
                />
              </label>
              {consultError ? <p className="mt-2 text-sm text-rose-700">{consultError}</p> : null}
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  disabled={!consultNote.trim() || consultSending}
                  onClick={() => void sendConsultMessage()}
                  className="inline-flex h-10 items-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {consultSending ? "送信中..." : "送信"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showStatusSection && isSendCompleteModalOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4 py-6">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={closeSendCompleteModal}
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
              aria-label="閉じる"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
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
            <p className="mt-2 text-sm text-slate-700">救急隊へ電話連絡してください。</p>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-center">
              <p className="text-xs font-semibold text-slate-500">救急隊電話番号</p>
              <p className="mt-1 text-4xl font-extrabold tracking-wide text-rose-700">{phoneCallNumber}</p>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setIsPhoneCallModalOpen(false)}
                className="inline-flex h-10 items-center rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700"
              >
                電話済み
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}



