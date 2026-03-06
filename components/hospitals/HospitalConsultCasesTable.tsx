"use client";

import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";

import { HospitalRequestDetail } from "@/components/hospitals/HospitalRequestDetail";
import { RequestStatusBadge } from "@/components/shared/RequestStatusBadge";
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

type Props = {
  rows: Row[];
};

export function HospitalConsultCasesTable({ rows }: Props) {
  const [splitOpen, setSplitOpen] = useState(false);
  const [activeRow, setActiveRow] = useState<Row | null>(null);
  const [detail, setDetail] = useState<RequestDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [messages, setMessages] = useState<ConsultMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const fetchDetail = async (targetId: number) => {
    setDetailLoading(true);
    setDetailError("");
    try {
      const res = await fetch(`/api/hospitals/requests/${targetId}`);
      const data = (await res.json()) as RequestDetailResponse | { message?: string };
      if (!res.ok) throw new Error("message" in data ? data.message ?? "詳細取得に失敗しました。" : "詳細取得に失敗しました。");
      setDetail(data as RequestDetailResponse);
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "詳細取得に失敗しました。");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchMessages = async (targetId: number) => {
    setMessagesLoading(true);
    setMessagesError("");
    try {
      const res = await fetch(`/api/hospitals/requests/${targetId}/consult`);
      const data = (await res.json()) as { messages?: ConsultMessage[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "相談履歴取得に失敗しました。");
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (error) {
      setMessagesError(error instanceof Error ? error.message : "相談履歴取得に失敗しました。");
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  const openSplit = async (row: Row) => {
    setActiveRow(row);
    setSplitOpen(true);
    setNote("");
    await Promise.all([fetchDetail(row.target_id), fetchMessages(row.target_id)]);
  };

  const closeSplit = () => {
    if (sending) return;
    setSplitOpen(false);
    setActiveRow(null);
    setDetail(null);
    setMessages([]);
    setNote("");
    setMessagesError("");
    setDetailError("");
  };

  const sendStatus = async (status: "NEGOTIATING" | "ACCEPTABLE" | "NOT_ACCEPTABLE", noteValue?: string) => {
    if (!activeRow) return;
    setSending(true);
    setMessagesError("");
    try {
      const res = await fetch(`/api/hospitals/requests/${activeRow.target_id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note: noteValue ?? undefined }),
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) throw new Error(data?.message ?? "更新に失敗しました。");
      await Promise.all([fetchDetail(activeRow.target_id), fetchMessages(activeRow.target_id)]);
      const nextStatusText = status === "ACCEPTABLE" ? "ACCEPTABLE" : status === "NOT_ACCEPTABLE" ? "NOT_ACCEPTABLE" : "NEGOTIATING";
      setActiveRow((prev) => (prev ? { ...prev, status: nextStatusText } : prev));
    } catch (error) {
      setMessagesError(error instanceof Error ? error.message : "更新に失敗しました。");
    } finally {
      setSending(false);
    }
  };

  const sendComment = async () => {
    if (!note.trim()) return;
    await sendStatus("NEGOTIATING", note.trim());
    setNote("");
  };

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
        <table className="min-w-[1560px] w-full table-fixed text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
            <tr>
              <th className="px-4 py-3">事案ID</th>
              <th className="px-4 py-3">救急隊名</th>
              <th className="px-4 py-3">覚知日時</th>
              <th className="px-4 py-3">住所</th>
              <th className="px-4 py-3">氏名</th>
              <th className="px-4 py-3">年齢</th>
              <th className="px-4 py-3">性別</th>
              <th className="px-4 py-3">最新HPコメント</th>
              <th className="px-4 py-3">最新Aコメント</th>
              <th className="px-4 py-3">選定科目</th>
              <th className="px-4 py-3">status</th>
              <th className="px-4 py-3">送信日時</th>
              <th className="px-4 py-3">詳細</th>
              <th className="px-4 py-3">相談</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const disabled = row.status === "TRANSPORT_DECIDED" || row.status === "TRANSPORT_DECLINED";
              return (
                <tr key={row.target_id} className={`border-t border-slate-100 ${disabled ? "text-slate-400" : "text-slate-700"}`}>
                  <td className="px-4 py-3 font-semibold">{row.case_id}</td>
                  <td className="px-4 py-3">{row.team_name ?? "-"}</td>
                  <td className="px-4 py-3">{[formatAwareDateYmd(row.aware_date ?? ""), row.aware_time].filter(Boolean).join(" ") || "-"}</td>
                  <td className="px-4 py-3">{row.dispatch_address ?? "-"}</td>
                  <td className="px-4 py-3">{row.patient_name ?? "-"}</td>
                  <td className="px-4 py-3">{row.patient_age ?? "-"}</td>
                  <td className="px-4 py-3">{row.patient_gender ?? "-"}</td>
                  <td className="px-4 py-3">{row.latest_hp_comment ?? "-"}</td>
                  <td className="px-4 py-3">{row.latest_ems_comment ?? "-"}</td>
                  <td className="px-4 py-3">{row.selected_departments?.join(", ") || "-"}</td>
                  <td className="px-4 py-3"><RequestStatusBadge status={row.status} /></td>
                  <td className="px-4 py-3">{formatDateTimeMdHm(row.sent_at)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => void openSplit(row)}
                      className="inline-flex h-8 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      詳細
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => void openSplit(row)}
                      className="inline-flex h-8 items-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      相談
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={14} className="px-4 py-8 text-sm text-slate-500">
                  該当事案はありません。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {splitOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4" onClick={closeSplit}>
          <div className="h-[88vh] w-[96vw] max-w-[1500px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">CONSULT VIEW</p>
                  <h3 className="text-sm font-bold text-slate-900">{activeRow?.case_id}</h3>
                </div>
                <button
                  type="button"
                  onClick={closeSplit}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                  aria-label="閉じる"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
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
                      <p className="text-xs text-slate-400">患者サマリーを見ながら相談できます。</p>
                    </div>
                    <div className="min-h-0 flex-1 overflow-auto bg-slate-50 px-4 py-3">
                      {messagesLoading ? <p className="text-sm text-slate-500">読み込み中...</p> : null}
                      {!messagesLoading && messages.length === 0 ? <p className="text-sm text-slate-500">相談履歴はありません。</p> : null}
                      <div className="space-y-3">
                        {messages.map((message) => {
                          const fromHp = message.actor === "HP";
                          return (
                            <div key={message.id} className={`flex ${fromHp ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${fromHp ? "bg-blue-600 text-white" : "bg-white text-slate-800"}`}>
                                <p className={`text-[11px] font-semibold ${fromHp ? "text-blue-100" : "text-slate-500"}`}>
                                  {fromHp ? "HP側" : "A側"} / {formatDateTimeMdHm(message.actedAt)}
                                </p>
                                <p className="mt-1 whitespace-pre-wrap break-words">{message.note}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="border-t border-slate-200 bg-white px-4 py-3">
                      <div className="mb-2 flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          disabled={sending}
                          onClick={() => void sendStatus("NOT_ACCEPTABLE")}
                          className="inline-flex h-8 items-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 disabled:opacity-50"
                        >
                          受入不可
                        </button>
                        <button
                          type="button"
                          disabled={sending}
                          onClick={() => void sendStatus("ACCEPTABLE")}
                          className="inline-flex h-8 items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 disabled:opacity-50"
                        >
                          受入可能
                        </button>
                      </div>
                      <textarea
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        placeholder="A側へ送る相談コメントを入力"
                      />
                      {messagesError ? <p className="mt-2 text-sm text-rose-700">{messagesError}</p> : null}
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          disabled={!note.trim() || sending}
                          onClick={() => void sendComment()}
                          className="inline-flex h-9 items-center rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          {sending ? "送信中..." : "送信"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
