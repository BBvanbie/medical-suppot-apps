"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { XMarkIcon } from "@heroicons/react/24/solid";

import { HospitalRequestDetail } from "@/components/hospitals/HospitalRequestDetail";
import { useHospitalRequestApi } from "@/components/hospitals/useHospitalRequestApi";
import { DecisionReasonDialog } from "@/components/shared/DecisionReasonDialog";
import { RequestStatusBadge } from "@/components/shared/RequestStatusBadge";
import { formatCaseGenderLabel } from "@/lib/casePresentation";
import { HOSPITAL_NOT_ACCEPTABLE_REASON_OPTIONS, type HospitalNotAcceptableReasonCode } from "@/lib/decisionReasons";
import { formatAwareDateYmd, formatDateTimeMdHm } from "@/lib/dateTimeFormat";

type Row = {
  target_id: number;
  case_id: string;
  team_name: string | null;
  aware_date: string | null;
  aware_time: string | null;
  dispatch_address: string | null;
  patient_name: string | null;
  patient_age: string | null;
  patient_gender: string | null;
  selected_departments: string[] | null;
  status: string;
  latest_hp_comment: string | null;
  latest_ems_comment: string | null;
  sent_at: string;
};

type Props = {
  rows: Row[];
  consultTemplate?: string;
};

export function HospitalConsultCasesTable({ rows, consultTemplate = "" }: Props) {
  const router = useRouter();
  const {
    detail,
    detailLoading,
    detailError,
    fetchDetail,
    resetDetail,
    messages,
    messagesLoading,
    messagesError,
    fetchMessages,
    resetMessages,
    updateStatus,
  } = useHospitalRequestApi();

  const [detailOpen, setDetailOpen] = useState(false);
  const [consultOpen, setConsultOpen] = useState(false);
  const [activeRow, setActiveRow] = useState<Row | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [actionError, setActionError] = useState("");
  const [decisionConfirm, setDecisionConfirm] = useState<"ACCEPTABLE" | null>(null);
  const [reasonCode, setReasonCode] = useState<HospitalNotAcceptableReasonCode | "">("");
  const [reasonText, setReasonText] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [isReasonDialogOpen, setIsReasonDialogOpen] = useState(false);
  const [phoneCallNumber, setPhoneCallNumber] = useState("");
  const [isPhoneCallModalOpen, setIsPhoneCallModalOpen] = useState(false);
  const [sendCompleteMessage, setSendCompleteMessage] = useState("");
  const [isSendCompleteModalOpen, setIsSendCompleteModalOpen] = useState(false);
  const [templateValue, setTemplateValue] = useState("");
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

  const openDetail = async (row: Row) => {
    setActiveRow(row);
    setDetailOpen(true);
    setActionError("");
    await fetchDetail(row.target_id);
  };

  const closeDetail = () => {
    if (sending) return;
    setDetailOpen(false);
    if (!consultOpen) {
      setActiveRow(null);
      resetDetail();
    }
  };

  const openConsult = async (row: Row) => {
    setActiveRow(row);
    setConsultOpen(true);
    setNote("");
    setTemplateValue("");
    setActionError("");
    setDecisionConfirm(null);
    await Promise.all([fetchDetail(row.target_id), fetchMessages(row.target_id)]);
  };

  const closeConsult = (force = false) => {
    if (sending && !force) return;
    setConsultOpen(false);
    setNote("");
    setTemplateValue("");
    setActionError("");
    setDecisionConfirm(null);
    resetMessages();
    if (!detailOpen || force) {
      setActiveRow(null);
      resetDetail();
    }
  };

  const sendStatus = async (
    status: "NEGOTIATING" | "ACCEPTABLE" | "NOT_ACCEPTABLE",
    noteValue?: string,
    reason?: { reasonCode?: string; reasonText?: string },
  ) => {
    if (!activeRow) return;
    setSending(true);
    setActionError("");
    try {
      const fromAcceptable = activeRow.status === "ACCEPTABLE";
      const result = await updateStatus(activeRow.target_id, status, noteValue, reason);
      if (!result.ok) throw new Error(result.message);

      await Promise.all([fetchDetail(activeRow.target_id), fetchMessages(activeRow.target_id)]);
      setActiveRow((prev) => (prev ? { ...prev, status, latest_hp_comment: noteValue ?? prev.latest_hp_comment } : prev));
      setDecisionConfirm(null);

      if (status === "ACCEPTABLE") {
        openSendCompleteModal("受入可能を送信しました。");
        return;
      }

      if (status === "NOT_ACCEPTABLE") {
        if (fromAcceptable) {
          setPhoneCallNumber(detail?.fromTeamPhone?.trim() || activeRow.team_name || "-");
          closeConsult(true);
          setIsPhoneCallModalOpen(true);
          router.refresh();
          return;
        }
        openSendCompleteModal("受入不可を送信しました。");
        return;
      }

      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "送信に失敗しました。");
    } finally {
      setSending(false);
    }
  };

  const sendComment = async () => {
    if (!note.trim()) return;
    await sendStatus("NEGOTIATING", note.trim());
    setNote("");
    setTemplateValue("");
  };

  const applyConsultTemplate = () => {
    if (!consultTemplate.trim()) return;
    setNote(consultTemplate);
    setTemplateValue("consult-template");
  };

  const openReasonDialog = () => {
    setReasonCode("");
    setReasonText("");
    setReasonError("");
    setIsReasonDialogOpen(true);
  };

  const sendNotAcceptable = async () => {
    setReasonError("");
    if (!activeRow) return;
    setIsReasonDialogOpen(false);
    await sendStatus("NOT_ACCEPTABLE", undefined, {
      reasonCode: reasonCode || undefined,
      reasonText: reasonText || undefined,
    });
  };

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
        <table className="min-w-[1560px] w-full table-fixed text-sm" data-testid="hospital-consults-table">
          <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
            <tr>
              <th className="px-4 py-3">事案ID</th>
              <th className="px-4 py-3">救急隊</th>
              <th className="px-4 py-3">覚知日時</th>
              <th className="px-4 py-3">現場住所</th>
              <th className="px-4 py-3">氏名</th>
              <th className="px-4 py-3">年齢</th>
              <th className="px-4 py-3">性別</th>
              <th className="px-4 py-3">最新HPコメント</th>
              <th className="px-4 py-3">最新Aコメント</th>
              <th className="px-4 py-3">診療科</th>
              <th className="px-4 py-3">ステータス</th>
              <th className="px-4 py-3">送信日時</th>
              <th className="px-4 py-3">詳細</th>
              <th className="px-4 py-3">相談</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={14} className="px-4 py-8 text-sm text-slate-500">相談中の事案はありません。</td>
              </tr>
            ) : null}
            {rows.map((row) => {
              const consultDisabled = row.status !== "NEGOTIATING";
              return (
                <tr key={row.target_id} className="border-t border-slate-100 text-slate-700" data-testid="hospital-consult-row" data-target-id={row.target_id}>
                  <td className="px-4 py-3 font-semibold">{row.case_id}</td>
                  <td className="px-4 py-3">{row.team_name ?? "-"}</td>
                  <td className="px-4 py-3">{[formatAwareDateYmd(row.aware_date ?? ""), row.aware_time].filter(Boolean).join(" ") || "-"}</td>
                  <td className="px-4 py-3">{row.dispatch_address ?? "-"}</td>
                  <td className="px-4 py-3">{row.patient_name ?? "-"}</td>
                  <td className="px-4 py-3">{row.patient_age ?? "-"}</td>
                  <td className="px-4 py-3">{formatCaseGenderLabel(row.patient_gender)}</td>
                  <td className="px-4 py-3">{row.latest_hp_comment ?? "-"}</td>
                  <td className="px-4 py-3">{row.latest_ems_comment ?? "-"}</td>
                  <td className="px-4 py-3">{row.selected_departments?.join(", ") || "-"}</td>
                  <td className="px-4 py-3"><RequestStatusBadge status={row.status} /></td>
                  <td className="px-4 py-3">{formatDateTimeMdHm(row.sent_at)}</td>
                  <td className="px-4 py-3">
                    <button type="button" data-testid="hospital-consult-detail-button" data-target-id={row.target_id} onClick={() => void openDetail(row)} className="inline-flex h-8 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700">詳細</button>
                  </td>
                  <td className="px-4 py-3">
                    <button type="button" data-testid="hospital-consult-open-button" data-target-id={row.target_id} disabled={consultDisabled} onClick={() => void openConsult(row)} className="inline-flex h-8 items-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50">相談</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {detailOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4 py-6" onClick={closeDetail} data-testid="hospital-consult-detail-modal">
          <div className="flex max-h-[92vh] w-full max-w-[1180px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[var(--dashboard-bg)] p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-3 flex items-center justify-between border-b border-slate-200 bg-[var(--dashboard-bg)] px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">PATIENT SUMMARY</p>
                <h3 className="mt-1 text-sm font-bold text-slate-900">{activeRow?.case_id ?? "-"}</h3>
              </div>
              <button type="button" onClick={closeDetail} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50" aria-label="閉じる"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              {detailLoading ? <p className="rounded-xl bg-white p-4 text-sm text-slate-500">読み込み中...</p> : null}
              {detailError ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{detailError}</p> : null}
              {detail ? <HospitalRequestDetail detail={detail} showStatusSection={false} /> : null}
            </div>
          </div>
        </div>
      ) : null}

      {consultOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4" onClick={() => closeConsult()} data-testid="hospital-consult-view-modal">
          <div className="h-[88vh] w-[96vw] max-w-[1500px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">CONSULT VIEW</p>
                  <h3 className="text-sm font-bold text-slate-900">{activeRow?.case_id}</h3>
                </div>
                <button type="button" onClick={() => closeConsult()} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50" aria-label="閉じる"><XMarkIcon className="h-5 w-5" /></button>
              </div>
              <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-2">
                <div className="min-h-0 overflow-auto border-r border-slate-200 bg-slate-50 p-3">
                  {detailLoading ? <p className="text-sm text-slate-500">詳細を読み込み中...</p> : null}
                  {detailError ? <p className="text-sm text-rose-700">{detailError}</p> : null}
                  {detail ? <HospitalRequestDetail detail={detail} showStatusSection={false} /> : null}
                </div>
                <div className="min-h-0 overflow-hidden bg-white">
                  <div className="flex h-full flex-col">
                    <div className="border-b border-slate-200 px-4 py-3">
                      <p className="text-xs font-semibold text-slate-500">相談チャット</p>
                      <p className="text-xs text-slate-400">救急隊へ相談コメントを送信しながら受入判断を送信できます。</p>
                    </div>
                    <div className="min-h-0 flex-1 overflow-auto bg-slate-50 px-4 py-3">
                      {messagesLoading ? <p className="text-sm text-slate-500">読み込み中...</p> : null}
                      {!messagesLoading && messages.length === 0 ? <p className="text-sm text-slate-500">相談履歴はまだありません。</p> : null}
                      <div className="space-y-3">
                        {messages.map((message) => {
                          const fromHp = message.actor === "HP";
                          return (
                            <div key={message.id} className={`flex ${fromHp ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${fromHp ? "bg-blue-600 text-white" : "bg-white text-slate-800"}`}>
                                <p className={`text-[11px] font-semibold ${fromHp ? "text-blue-100" : "text-slate-500"}`}>{fromHp ? "HP側" : "A側"} / {formatDateTimeMdHm(message.actedAt)}</p>
                                <p className="mt-1 whitespace-pre-wrap break-words">{message.note}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="border-t border-slate-200 bg-white px-4 py-3">
                      <div className="mb-2 flex flex-wrap justify-end gap-2">
                        {consultTemplate.trim() ? (
                          <select value={templateValue} onChange={(event) => { const nextValue = event.target.value; setTemplateValue(nextValue); if (nextValue === "consult-template") applyConsultTemplate(); }} className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700">
                            <option value="">テンプレートを選択</option>
                            <option value="consult-template">要相談テンプレート</option>
                          </select>
                        ) : null}
                        <button type="button" disabled={sending} onClick={openReasonDialog} className="inline-flex h-8 items-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 disabled:opacity-50">受入不可を送信</button>
                        <button type="button" disabled={sending} onClick={() => setDecisionConfirm("ACCEPTABLE")} className="inline-flex h-8 items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 disabled:opacity-50">受入可能を送信</button>
                      </div>
                      {decisionConfirm ? (
                        <div className="mb-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                          <p className="text-sm text-slate-700">受入可能を送信しますか？</p>
                          <div className="mt-2 flex justify-end gap-2">
                            <button type="button" disabled={sending} onClick={() => setDecisionConfirm(null)} className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 disabled:opacity-50">キャンセル</button>
                            <button type="button" disabled={sending} onClick={() => void sendStatus("ACCEPTABLE")} className="inline-flex h-8 items-center rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white disabled:opacity-50">OK</button>
                          </div>
                        </div>
                      ) : null}
                      <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="A側へ送る相談コメントを入力してください" />
                      {messagesError ? <p className="mt-2 text-sm text-rose-700">{messagesError}</p> : null}
                      {actionError ? <p className="mt-2 text-sm text-rose-700">{actionError}</p> : null}
                      <div className="mt-2 flex justify-end">
                        <button type="button" data-testid="hospital-consult-send" disabled={!note.trim() || sending} onClick={() => void sendComment()} className="inline-flex h-9 items-center rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white disabled:opacity-50">{sending ? "送信中..." : "送信"}</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <DecisionReasonDialog
        open={isReasonDialogOpen}
        title="受入不可理由を選択"
        description="受入不可を送信するには理由が必須です。"
        options={HOSPITAL_NOT_ACCEPTABLE_REASON_OPTIONS}
        value={reasonCode}
        textValue={reasonText}
        error={reasonError}
        sending={sending}
        confirmLabel="受入不可を送信"
        onClose={() => setIsReasonDialogOpen(false)}
        onChangeValue={setReasonCode}
        onChangeText={setReasonText}
        onConfirm={() => void sendNotAcceptable()}
      />

      {isSendCompleteModalOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4 py-6">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <button type="button" onClick={closeSendCompleteModal} className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" aria-label="閉じる"><XMarkIcon className="h-4 w-4" /></button>
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
              <p className="mt-1 text-2xl font-extrabold tracking-wide text-rose-700">{phoneCallNumber}</p>
            </div>
            <div className="mt-5 flex justify-end">
              <button type="button" onClick={() => setIsPhoneCallModalOpen(false)} className="inline-flex h-10 items-center rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700">電話済み</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}