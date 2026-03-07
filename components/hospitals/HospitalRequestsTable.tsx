"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { XMarkIcon } from "@heroicons/react/24/solid";

import { HospitalRequestDetail } from "@/components/hospitals/HospitalRequestDetail";
import { ConsultChatModal } from "@/components/shared/ConsultChatModal";
import { RequestStatusBadge } from "@/components/shared/RequestStatusBadge";
import { formatAwareDateYmd, formatDateTimeMdHm } from "@/lib/dateTimeFormat";

type RequestRow = {
  targetId: number;
  requestId: string;
  caseId: string;
  status: string;
  statusLabel: string;
  sentAt: string;
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
};

type RequestDetailResponse = {
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

type ConsultMessage = {
  id: number;
  actor: "HP" | "A";
  actedAt: string;
  note: string;
};

export function HospitalRequestsTable({ rows }: HospitalRequestsTableProps) {
  const router = useRouter();
  const [activeTargetId, setActiveTargetId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detail, setDetail] = useState<RequestDetailResponse | null>(null);
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [consultTargetId, setConsultTargetId] = useState<number | null>(null);
  const [consultTitle, setConsultTitle] = useState("");
  const [consultLoading, setConsultLoading] = useState(false);
  const [consultError, setConsultError] = useState("");
  const [consultSending, setConsultSending] = useState(false);
  const [consultNote, setConsultNote] = useState("");
  const [consultMessages, setConsultMessages] = useState<ConsultMessage[]>([]);
  const [consultDecisionConfirm, setConsultDecisionConfirm] = useState<"ACCEPTABLE" | "NOT_ACCEPTABLE" | null>(null);
  const [consultCurrentStatus, setConsultCurrentStatus] = useState<string>("");
  const [consultTeamPhone, setConsultTeamPhone] = useState<string>("");
  const [isPhoneCallModalOpen, setIsPhoneCallModalOpen] = useState(false);
  const [phoneCallNumber, setPhoneCallNumber] = useState("");
  const [isSendCompleteModalOpen, setIsSendCompleteModalOpen] = useState(false);
  const [sendCompleteMessage, setSendCompleteMessage] = useState("");
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
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
    () =>
      rows.map((row) => ({
        ...row,
        sentAtLabel: formatDateTimeMdHm(row.sentAt),
      })),
    [rows],
  );

  const openDetail = async (targetId: number) => {
    setActiveTargetId(targetId);
    setDetailLoading(true);
    setDetailError("");
    setDetail(null);
    try {
      const res = await fetch(`/api/hospitals/requests/${targetId}`);
      const data = (await res.json()) as RequestDetailResponse | { message?: string };
      if (!res.ok) {
        throw new Error("message" in data ? data.message ?? "詳細取得に失敗しました。" : "詳細取得に失敗しました。");
      }
      setDetail(data as RequestDetailResponse);
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "詳細取得に失敗しました。");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setActiveTargetId(null);
    setDetail(null);
    setDetailError("");
    setDetailLoading(false);
  };

  const fetchConsultMessages = async (targetId: number) => {
    setConsultLoading(true);
    setConsultError("");
    try {
      const res = await fetch(`/api/hospitals/requests/${targetId}/consult`);
      const data = (await res.json()) as { messages?: ConsultMessage[]; message?: string };
      if (!res.ok) {
        throw new Error(data.message ?? "相談履歴の取得に失敗しました。");
      }
      setConsultMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (e) {
      setConsultError(e instanceof Error ? e.message : "相談履歴の取得に失敗しました。");
      setConsultMessages([]);
    } finally {
      setConsultLoading(false);
    }
  };

  const openConsult = async (row: RequestRow) => {
    setConsultTargetId(row.targetId);
    setConsultTitle(`${row.caseId} / ${row.requestId}`);
    setConsultCurrentStatus(row.status);
    setConsultTeamPhone(row.fromTeamPhone ?? "");
    setConsultNote("");
    setConsultError("");
    setConsultMessages([]);
    setIsConsultModalOpen(true);
    await fetchConsultMessages(row.targetId);
  };

  const closeConsult = (force = false) => {
    if (consultSending && !force) return;
    setIsConsultModalOpen(false);
    setConsultTargetId(null);
    setConsultTitle("");
    setConsultNote("");
    setConsultLoading(false);
    setConsultError("");
    setConsultMessages([]);
    setConsultDecisionConfirm(null);
    setConsultCurrentStatus("");
    setConsultTeamPhone("");
  };

  const sendConsult = async () => {
    if (!consultTargetId || !consultNote.trim() || consultSending) return;
    setConsultSending(true);
    setConsultError("");
    try {
      const res = await fetch(`/api/hospitals/requests/${consultTargetId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "NEGOTIATING", note: consultNote.trim() }),
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) {
        throw new Error(data?.message ?? "相談送信に失敗しました。");
      }
      setConsultCurrentStatus("NEGOTIATING");
      setConsultNote("");
      await fetchConsultMessages(consultTargetId);
    } catch (e) {
      setConsultError(e instanceof Error ? e.message : "相談送信に失敗しました。");
    } finally {
      setConsultSending(false);
    }
  };

  const sendDecisionFromConsult = async (nextStatus: "ACCEPTABLE" | "NOT_ACCEPTABLE") => {
    if (!consultTargetId || consultSending) return;
    setConsultSending(true);
    setConsultError("");
    try {
      const res = await fetch(`/api/hospitals/requests/${consultTargetId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) {
        throw new Error(data?.message ?? "状態更新に失敗しました。");
      }
      setConsultDecisionConfirm(null);
      if (nextStatus === "ACCEPTABLE") {
        setConsultCurrentStatus("ACCEPTABLE");
        await fetchConsultMessages(consultTargetId);
        openSendCompleteModal("受入可能を送信しました。");
        router.refresh();
        return;
      }

      if (consultCurrentStatus === "ACCEPTABLE" && nextStatus === "NOT_ACCEPTABLE") {
        setPhoneCallNumber(consultTeamPhone || "-");
        closeConsult(true);
        setIsPhoneCallModalOpen(true);
        router.refresh();
        return;
      }

      closeConsult(true);
      openSendCompleteModal("受入不可を送信しました。");
      router.refresh();
    } catch (e) {
      setConsultError(e instanceof Error ? e.message : "状態更新に失敗しました。");
    } finally {
      setConsultSending(false);
    }
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
      <table className="min-w-[1320px] table-fixed text-sm">
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
              <td className="px-4 py-8 text-sm text-slate-500" colSpan={8}>
                受入要請はまだありません。
              </td>
            </tr>
          ) : null}
          {normalizedRows.map((row) => (
            <tr key={row.targetId} className="border-t border-slate-100">
              <td className="px-4 py-3 text-slate-700">{row.sentAtLabel}</td>
              <td className="px-4 py-3 font-semibold text-slate-700">{row.caseId}</td>
              <td className="px-4 py-3 text-slate-700">
                {[formatAwareDateYmd(row.awareDate), row.awareTime].filter(Boolean).join(" ") || "-"}
              </td>
              <td className="px-4 py-3 text-slate-700">{row.dispatchAddress || "-"}</td>
              <td className="px-4 py-3 text-slate-700">
                {row.fromTeamName ?? "-"}
                {row.fromTeamCode ? <span className="ml-2 text-xs text-slate-500">({row.fromTeamCode})</span> : null}
              </td>
              <td className="px-4 py-3 text-slate-700">{row.selectedDepartments?.join(", ") || "-"}</td>
              <td className="px-4 py-3">
                <RequestStatusBadge status={row.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void openDetail(row.targetId)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700"
                  >
                    <span>詳細</span>
                  </button>
                  {row.status === "NEGOTIATING" ? (
                    <button
                      type="button"
                      onClick={() => void openConsult(row)}
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      <span>相談</span>
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {activeTargetId !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4 py-6" onClick={closeDetail}>
          <div
            className="flex max-h-[92vh] w-full max-w-[1180px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[var(--dashboard-bg)] p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-3 flex items-center justify-end border-b border-slate-200 bg-[var(--dashboard-bg)] px-4 py-3">
              <button
                type="button"
                onClick={closeDetail}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                aria-label="閉じる"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              {detailLoading ? <p className="rounded-xl bg-white p-4 text-sm text-slate-500">読み込み中...</p> : null}
              {detailError ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{detailError}</p> : null}
              {detail ? <HospitalRequestDetail detail={detail} /> : null}
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
        sending={consultSending}
        canSend={Boolean(consultNote.trim())}
        onClose={() => closeConsult()}
        onChangeNote={setConsultNote}
        onSend={() => void sendConsult()}
        topActions={
          <>
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
          </>
        }
        confirmSection={
          consultDecisionConfirm ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
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
          ) : null
        }
      />

      {isSendCompleteModalOpen ? (
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

