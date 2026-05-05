"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { XMarkIcon } from "@heroicons/react/24/solid";

import { HospitalRequestDetail } from "@/components/hospitals/HospitalRequestDetail";
import { useHospitalRequestApi } from "@/components/hospitals/useHospitalRequestApi";
import { BUTTON_BASE_CLASS, BUTTON_VARIANT_CLASS } from "@/components/shared/buttonStyles";
import { DetailDialogFrame } from "@/components/shared/DetailDialogFrame";
import { DecisionReasonDialog } from "@/components/shared/DecisionReasonDialog";
import { LoadingButton } from "@/components/shared/loading";
import { RequestStatusBadge } from "@/components/shared/RequestStatusBadge";
import { formatCaseGenderLabel } from "@/lib/casePresentation";
import { HOSPITAL_NOT_ACCEPTABLE_REASON_OPTIONS, type HospitalNotAcceptableReasonCode } from "@/lib/decisionReasons";
import { formatAwareDateYmd, formatDateTimeMdHm } from "@/lib/dateTimeFormat";
import {
  getHospitalDepartmentPrioritySummary,
  getHospitalNextActionLabel,
} from "@/lib/hospitalPriority";

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

function getPriorityChipClass(summary: string | null) {
  if (summary === "救命優先") return "bg-rose-50 text-rose-700";
  if (summary === "CCU優先") return "bg-blue-50 text-blue-700";
  if (summary === "脳卒中優先") return "bg-violet-50 text-violet-700";
  return "bg-slate-100 text-slate-600";
}

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
    if (!activeRow) return false;
    setSending(true);
    setActionError("");
    try {
      const requiresPhoneCall = activeRow.status === "ACCEPTABLE" || activeRow.status === "TRANSPORT_DECIDED";
      const result = await updateStatus(activeRow.target_id, status, noteValue, reason);
      if (!result.ok) throw new Error(result.message);

      await Promise.all([fetchDetail(activeRow.target_id), fetchMessages(activeRow.target_id)]);
      setActiveRow((prev) => (prev ? { ...prev, status, latest_hp_comment: noteValue ?? prev.latest_hp_comment } : prev));
      setDecisionConfirm(null);

      if (status === "ACCEPTABLE") {
        openSendCompleteModal("受入可能を送信しました。");
        return true;
      }

      if (status === "NOT_ACCEPTABLE") {
        if (requiresPhoneCall) {
          setPhoneCallNumber(detail?.fromTeamPhone?.trim() || "-");
          closeConsult(true);
          setIsPhoneCallModalOpen(true);
          router.refresh();
          return true;
        }
        openSendCompleteModal("受入不可を送信しました。");
        return true;
      }

      router.refresh();
      return true;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "送信に失敗しました。");
      return false;
    } finally {
      setSending(false);
    }
  };

  const sendComment = async () => {
    if (!activeRow || !note.trim() || sending) return;
    setSending(true);
    setActionError("");
    try {
      const nextNote = note.trim();
      const res = await fetch(`/api/hospitals/requests/${activeRow.target_id}/consult`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: nextNote }),
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) throw new Error(data?.message ?? "相談送信に失敗しました。");
      await Promise.all([fetchDetail(activeRow.target_id), fetchMessages(activeRow.target_id)]);
      setActiveRow((prev) => (prev ? { ...prev, status: "NEGOTIATING", latest_hp_comment: nextNote } : prev));
      setNote("");
      setTemplateValue("");
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "相談送信に失敗しました。");
    } finally {
      setSending(false);
    }
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
    const ok = await sendStatus("NOT_ACCEPTABLE", undefined, {
      reasonCode: reasonCode || undefined,
      reasonText: reasonText || undefined,
    });
    if (ok) setIsReasonDialogOpen(false);
  };

  return (
    <>
      <div className="space-y-3" data-testid="hospital-consults-table">
        {rows.length === 0 ? (
          <div className="ds-table-surface px-4 py-8 text-sm text-slate-500">相談中の事案はありません。</div>
        ) : null}
        {rows.map((row) => {
          const consultDisabled = row.status !== "NEGOTIATING";
          const prioritySummary = getHospitalDepartmentPrioritySummary(row.selected_departments);
          const nextActionLabel = getHospitalNextActionLabel(row.status);
          return (
            <article key={row.target_id} className="ds-table-surface border border-slate-200 px-4 py-4" data-testid="hospital-consult-row" data-target-id={row.target_id}>
              <div className="grid gap-4 xl:ds-grid-fluid-action">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <RequestStatusBadge status={row.status} />
                    {prioritySummary ? (
                      <span className={`rounded-full px-2.5 py-1 ds-text-xs-compact font-semibold ${getPriorityChipClass(prioritySummary)}`}>
                        {prioritySummary}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 ds-text-xs-compact font-semibold text-blue-700">{nextActionLabel}</span>
                    <p className="text-base font-bold text-slate-950">{row.case_id}</p>
                    <p className="text-xs font-semibold text-slate-500">{formatDateTimeMdHm(row.sent_at)}</p>
                  </div>
                  <div className="mt-3 grid gap-3 ds-grid-md-hospital-case-row">
                    <div>
                      <p className="ds-text-2xs font-semibold ds-track-section text-slate-400">選定科目</p>
                      <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900">{row.selected_departments?.join(", ") || "-"}</p>
                    </div>
                    <div>
                      <p className="ds-text-2xs font-semibold ds-track-section text-slate-400">救急隊</p>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-900">{row.team_name ?? "-"}</p>
                    </div>
                    <div>
                      <p className="ds-text-2xs font-semibold ds-track-section text-slate-400">患者</p>
                      <p className="mt-1 truncate text-sm text-slate-700">{row.patient_name ?? "-"} / {row.patient_age ?? "-"} / {formatCaseGenderLabel(row.patient_gender)}</p>
                    </div>
                    <div>
                      <p className="ds-text-2xs font-semibold ds-track-section text-slate-400">覚知</p>
                      <p className="mt-1 text-sm text-slate-700">{[formatAwareDateYmd(row.aware_date ?? ""), row.aware_time].filter(Boolean).join(" ") || "-"}</p>
                    </div>
                    <div>
                      <p className="ds-text-2xs font-semibold ds-track-section text-slate-400">現場住所</p>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-700">{row.dispatch_address ?? "-"}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-start justify-end gap-2">
                  <button type="button" data-testid="hospital-consult-detail-button" data-target-id={row.target_id} onClick={() => void openDetail(row)} className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700">詳細</button>
                  <button type="button" data-testid="hospital-consult-open-button" data-target-id={row.target_id} disabled={consultDisabled} onClick={() => void openConsult(row)} className="inline-flex h-9 items-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50">相談</button>
                </div>
              </div>
              <div className="mt-4 grid gap-3 border-t border-slate-100 pt-3 ds-grid-md-hospital-secondary">
                <div>
                  <p className="ds-text-2xs font-semibold ds-track-section text-slate-400">最新HPコメント</p>
                  <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{row.latest_hp_comment ?? "-"}</p>
                </div>
                <div>
                  <p className="ds-text-2xs font-semibold ds-track-section text-slate-400">最新Aコメント</p>
                  <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{row.latest_ems_comment ?? "-"}</p>
                </div>
                <div>
                  <p className="ds-text-2xs font-semibold ds-track-section text-slate-400">次に見ること</p>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-700">{nextActionLabel}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <DetailDialogFrame
        open={detailOpen}
        onClose={closeDetail}
        dataTestId="hospital-consult-detail-modal"
        kicker="PATIENT SUMMARY"
        title={activeRow?.case_id ?? "-"}
      >
        {detailLoading ? <p className="ds-muted-panel rounded-xl p-4 text-sm text-slate-500">読み込み中...</p> : null}
        {detailError ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{detailError}</p> : null}
        {detail ? <HospitalRequestDetail detail={detail} showStatusSection={false} /> : null}
      </DetailDialogFrame>

      {consultOpen ? (
        <div className="modal-shell-pad ds-dialog-backdrop" onClick={() => closeConsult()} data-testid="hospital-consult-view-modal">
          <div className="ds-dialog-surface ds-h-dialog-lg ds-w-dialog-fluid ds-max-w-dialog-xxl overflow-hidden p-0" onClick={(event) => event.stopPropagation()}>
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold uppercase ds-track-eyebrow-wide text-blue-600">CONSULT VIEW</p>
                  <h3 className="text-sm font-bold text-slate-900">{activeRow?.case_id}</h3>
                </div>
                <button type="button" onClick={() => closeConsult()} className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.secondary} h-9 w-9 rounded-lg px-0 text-slate-600`} aria-label="閉じる"><XMarkIcon className="h-5 w-5" /></button>
              </div>
              <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 ds-grid-lg-two-three">
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
                    {activeRow ? (
                      <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-3">
                        <p className="ds-text-2xs font-semibold ds-track-eyebrow text-slate-500">CONSULT CHECKPOINTS</p>
                        <div className="mt-2 grid gap-3 md:grid-cols-3">
                          <div>
                            <p className="text-xs font-semibold text-slate-500">選定科目</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">{activeRow.selected_departments?.join(", ") || "-"}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500">最新HPコメント</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">{activeRow.latest_hp_comment?.trim() || "まだ送信なし"}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500">最新Aコメント</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">{activeRow.latest_ems_comment?.trim() || "まだ返信なし"}</p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    <div className="min-h-0 flex-1 overflow-auto bg-slate-50 px-4 py-3">
                      {messagesLoading ? <p className="text-sm text-slate-500">読み込み中...</p> : null}
                      {!messagesLoading && messages.length === 0 ? <p className="text-sm text-slate-500">相談履歴はまだありません。</p> : null}
                      <div className="space-y-3">
                        {messages.map((message) => {
                          const fromHp = message.actor === "HP";
                          return (
                            <div key={message.id} className={`flex ${fromHp ? "justify-end" : "justify-start"}`}>
                              <div className={`ds-max-w-chat rounded-2xl px-4 py-2 text-sm shadow-sm ${fromHp ? "bg-blue-600 text-white" : "bg-white text-slate-800"}`}>
                                <p className={`ds-text-xs-compact font-semibold ${fromHp ? "text-blue-100" : "text-slate-500"}`}>{fromHp ? "HP側" : "A側"} / {formatDateTimeMdHm(message.actedAt)}</p>
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
                          <select value={templateValue} onChange={(event) => { const nextValue = event.target.value; setTemplateValue(nextValue); if (nextValue === "consult-template") applyConsultTemplate(); }} className="ds-field h-8 rounded-lg px-3 text-xs font-semibold text-slate-700">
                            <option value="">テンプレートを選択</option>
                            <option value="consult-template">要相談テンプレート</option>
                          </select>
                        ) : null}
                        <LoadingButton type="button" disabled={sending} loading={false} onClick={openReasonDialog} variant="danger" className="h-8 rounded-lg px-3 text-xs">受入不可を送信</LoadingButton>
                        <LoadingButton type="button" disabled={sending} loading={false} onClick={() => setDecisionConfirm("ACCEPTABLE")} className="h-8 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">受入可能を送信</LoadingButton>
                      </div>
                      {decisionConfirm ? (
                        <div className="ds-muted-panel mb-2 rounded-lg px-3 py-2">
                          <p className="text-sm text-slate-700">受入可能を送信しますか？</p>
                          <div className="mt-2 flex justify-end gap-2">
                            <button type="button" disabled={sending} onClick={() => setDecisionConfirm(null)} className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.secondary} h-8 rounded-lg px-3 text-xs disabled:opacity-50`}>キャンセル</button>
                            <LoadingButton type="button" loading={sending} loadingLabel="送信中..." onClick={() => void sendStatus("ACCEPTABLE")} className="h-8 rounded-lg bg-slate-900 px-3 text-xs text-white hover:bg-slate-700 disabled:opacity-50">OK</LoadingButton>
                          </div>
                        </div>
                      ) : null}
                      <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="ds-field w-full rounded-lg px-3 py-2 text-sm" placeholder="A側へ送る相談コメントを入力してください" />
                      {messagesError ? <p className="mt-2 text-sm text-rose-700">{messagesError}</p> : null}
                      {actionError ? <p className="mt-2 text-sm text-rose-700">{actionError}</p> : null}
                      <div className="mt-2 flex justify-end">
                        <LoadingButton type="button" data-testid="hospital-consult-send" disabled={!note.trim()} loading={sending} loadingLabel="送信中..." onClick={() => void sendComment()} className="h-9 rounded-lg bg-blue-600 px-3 text-xs text-white hover:bg-blue-700 disabled:opacity-50">送信</LoadingButton>
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
        tone="danger"
        onClose={() => setIsReasonDialogOpen(false)}
        onChangeValue={setReasonCode}
        onChangeText={setReasonText}
        onConfirm={() => void sendNotAcceptable()}
      />

      {isSendCompleteModalOpen ? (
        <div className="modal-shell-pad ds-dialog-backdrop">
          <div className="ds-dialog-surface relative w-full max-w-md p-6">
            <button type="button" onClick={closeSendCompleteModal} className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.secondary} absolute right-4 top-4 h-8 w-8 rounded-lg px-0 text-slate-600`} aria-label="閉じる"><XMarkIcon className="h-4 w-4" /></button>
            <p className="text-xs font-semibold uppercase ds-track-eyebrow-wide text-emerald-600">COMPLETED</p>
            <h3 className="mt-2 text-lg font-bold text-slate-900">送信完了</h3>
            <p className="mt-2 text-sm text-slate-700">{sendCompleteMessage}</p>
            <p className="mt-1 text-sm text-slate-600">3秒後にモーダルを閉じます。</p>
          </div>
        </div>
      ) : null}

      {isPhoneCallModalOpen ? (
        <div className="modal-shell-pad bg-slate-900/65">
          <div className="ds-dialog-surface w-full max-w-lg border-rose-200 p-6">
            <p className="text-xs font-semibold uppercase ds-track-eyebrow-wide text-rose-600">CALL REQUIRED</p>
            <h3 className="mt-2 text-xl font-bold text-slate-900">受入不可を送信しました</h3>
            <p className="mt-2 text-sm text-slate-700">A隊へ電話連絡してください。</p>
            <div className="ds-muted-panel mt-4 rounded-xl px-4 py-4 text-center">
              <p className="text-xs font-semibold text-slate-500">A隊電話番号</p>
              <p className="mt-1 text-2xl font-extrabold tracking-wide text-rose-700">{phoneCallNumber}</p>
            </div>
            <div className="mt-5 flex justify-end">
              <button type="button" onClick={() => setIsPhoneCallModalOpen(false)} className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.danger} h-10 rounded-xl px-4 text-sm`}>電話連絡済み</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
