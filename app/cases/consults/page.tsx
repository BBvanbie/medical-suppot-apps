"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";

import { Sidebar } from "@/components/home/Sidebar";
import { formatAwareDateYmd, formatDateTimeMdHm } from "@/lib/dateTimeFormat";

type ConsultTargetRow = {
  target_id: number;
  case_id: string;
  request_id: string;
  hospital_name: string;
  aware_date: string | null;
  aware_time: string | null;
  dispatch_address: string | null;
  patient_name: string | null;
};

type ConsultMessage = {
  id: number;
  actor: "A" | "HP";
  actedAt: string;
  note: string;
};

type RequestStatus =
  | "UNREAD"
  | "READ"
  | "NEGOTIATING"
  | "ACCEPTABLE"
  | "NOT_ACCEPTABLE"
  | "TRANSPORT_DECIDED"
  | "TRANSPORT_DECLINED";

export default function CasesConsultsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [rows, setRows] = useState<ConsultTargetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedCaseIds, setExpandedCaseIds] = useState<Record<string, boolean>>({});
  const [chatTarget, setChatTarget] = useState<ConsultTargetRow | null>(null);
  const [chatMessages, setChatMessages] = useState<ConsultMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [chatNote, setChatNote] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatStatus, setChatStatus] = useState<RequestStatus | null>(null);
  const [decisionConfirm, setDecisionConfirm] = useState<"TRANSPORT_DECIDED" | "TRANSPORT_DECLINED" | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/cases/consults");
        const data = (await res.json()) as { rows?: ConsultTargetRow[]; message?: string };
        if (!res.ok) throw new Error(data.message ?? "相談一覧の取得に失敗しました。");
        setRows(Array.isArray(data.rows) ? data.rows : []);
      } catch (e) {
        setRows([]);
        setError(e instanceof Error ? e.message : "相談一覧の取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const groupedRows = useMemo(() => {
    const map = new Map<string, ConsultTargetRow[]>();
    for (const row of rows) {
      const current = map.get(row.case_id) ?? [];
      current.push(row);
      map.set(row.case_id, current);
    }
    return Array.from(map.entries()).map(([caseId, targets]) => ({
      caseId,
      targets,
      awareDate: targets[0]?.aware_date ?? "",
      awareTime: targets[0]?.aware_time ?? "",
      dispatchAddress: targets[0]?.dispatch_address ?? "",
      patientName: targets[0]?.patient_name ?? "",
    }));
  }, [rows]);

  const toggleExpand = (caseId: string) => {
    setExpandedCaseIds((prev) => ({ ...prev, [caseId]: !prev[caseId] }));
  };

  const fetchChat = async (target: ConsultTargetRow) => {
    setChatTarget(target);
    setChatMessages([]);
    setChatNote("");
    setChatError("");
    setChatLoading(true);
    setChatStatus(null);
    try {
      const res = await fetch(`/api/cases/consults/${target.target_id}`);
      const data = (await res.json()) as { status?: RequestStatus; messages?: ConsultMessage[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "相談履歴の取得に失敗しました。");
      setChatStatus(data.status ?? null);
      setChatMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "相談履歴の取得に失敗しました。");
      setChatMessages([]);
    } finally {
      setChatLoading(false);
    }
  };

  const closeChat = () => {
    setChatTarget(null);
    setChatMessages([]);
    setChatError("");
    setChatNote("");
    setChatLoading(false);
    setChatStatus(null);
    setDecisionConfirm(null);
  };

  const sendReply = async () => {
    if (!chatTarget || !chatNote.trim() || chatSending) return;
    setChatSending(true);
    setChatError("");
    try {
      const res = await fetch(`/api/cases/consults/${chatTarget.target_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: chatNote.trim() }),
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) throw new Error(data?.message ?? "相談回答の送信に失敗しました。");
      setChatNote("");
      await fetchChat(chatTarget);
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "相談回答の送信に失敗しました。");
    } finally {
      setChatSending(false);
    }
  };

  const canSendDecide = chatStatus === "ACCEPTABLE";
  const canSendDecline = chatStatus === "NEGOTIATING" || chatStatus === "ACCEPTABLE";

  const sendDecision = async (nextStatus: "TRANSPORT_DECIDED" | "TRANSPORT_DECLINED") => {
    if (!chatTarget || chatSending) return;
    setChatSending(true);
    setChatError("");
    try {
      const res = await fetch("/api/cases/send-history", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: chatTarget.case_id,
          targetId: chatTarget.target_id,
          status: nextStatus,
          action: "DECIDE",
        }),
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) throw new Error(data?.message ?? "搬送判断の送信に失敗しました。");
      setDecisionConfirm(null);
      await fetchChat(chatTarget);
      const listRes = await fetch("/api/cases/consults");
      const listData = (await listRes.json()) as { rows?: ConsultTargetRow[]; message?: string };
      if (listRes.ok) setRows(Array.isArray(listData.rows) ? listData.rows : []);
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "搬送判断の送信に失敗しました。");
    } finally {
      setChatSending(false);
    }
  };

  return (
    <div className="dashboard-shell h-screen overflow-hidden bg-[var(--dashboard-bg)] text-slate-900">
      <div className="flex h-full">
        <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen((v) => !v)} />
        <main className="flex min-w-0 flex-1 flex-col px-4 py-6 sm:px-5 lg:px-6">
          <header className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-teal)]">CONSULTS</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">要相談一覧</h1>
          </header>

          <section className="min-h-0 flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
            <table className="w-full table-fixed text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">事案ID</th>
                  <th className="px-4 py-3">覚知日時</th>
                  <th className="px-4 py-3">指令先住所</th>
                  <th className="px-4 py-3">氏名</th>
                  <th className="px-4 py-3 text-right">要相談病院数</th>
                </tr>
              </thead>
              <tbody>
                {groupedRows.map((row) => {
                  const expanded = Boolean(expandedCaseIds[row.caseId]);
                  return (
                    <Fragment key={row.caseId}>
                    <tr
                      key={`case-${row.caseId}`}
                      onClick={() => toggleExpand(row.caseId)}
                      className="cursor-pointer border-t border-slate-100 transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {row.caseId}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {[formatAwareDateYmd(row.awareDate), row.awareTime].filter(Boolean).join(" ") || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.dispatchAddress || "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{row.patientName || "-"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">{row.targets.length}</td>
                    </tr>
                    <tr key={`expanded-${row.caseId}`} className="border-t border-slate-100">
                        <td className="px-0 py-0" colSpan={5}>
                          <div
                            className={`overflow-hidden transition-all duration-300 ease-out ${
                              expanded ? "max-h-[800px] translate-y-0 opacity-100" : "max-h-0 -translate-y-1 opacity-0"
                            }`}
                          >
                            <div className="bg-slate-50 px-4 py-3">
                            <div className="space-y-2">
                              {row.targets.map((target) => (
                                <div key={target.target_id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                                  <div className="text-sm text-slate-700">
                                    <p className="font-semibold">{target.hospital_name}</p>
                                    <p className="text-xs text-slate-500">要請ID: {target.request_id}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void fetchChat(target);
                                    }}
                                    className="inline-flex h-8 items-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                                  >
                                    チャット
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
                {!loading && groupedRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-sm text-slate-500" colSpan={5}>
                      要相談の事案はありません。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            {loading ? <p className="px-4 py-3 text-sm text-slate-500">読み込み中...</p> : null}
            {error ? <p className="px-4 py-3 text-sm text-rose-700">{error}</p> : null}
          </section>
        </main>
      </div>

      {chatTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4 py-6" onClick={closeChat}>
          <div className="flex h-[78vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">CONSULT CHAT</p>
                <h3 className="mt-1 text-base font-bold text-slate-900">{chatTarget.hospital_name}</h3>
                <p className="text-xs text-slate-500">
                  {chatTarget.case_id} / {chatTarget.request_id}
                </p>
              </div>
              <button type="button" onClick={closeChat} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50" aria-label="閉じる">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-slate-50 px-4 py-4">
              {chatLoading ? <p className="text-sm text-slate-500">読み込み中...</p> : null}
              {!chatLoading && chatMessages.length === 0 ? <p className="text-sm text-slate-500">相談履歴はまだありません。</p> : null}
              {!chatLoading ? (
                <div className="space-y-3">
                  {chatMessages.map((message) => {
                    const fromA = message.actor === "A";
                    return (
                      <div key={message.id} className={`flex ${fromA ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm shadow-sm ${fromA ? "bg-blue-600 text-white" : "bg-white text-slate-800"}`}>
                          <p className={`text-[11px] font-semibold ${fromA ? "text-blue-100" : "text-slate-500"}`}>
                            {fromA ? "A側" : "HP側"} / {formatDateTimeMdHm(message.actedAt)}
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
              <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={chatSending || !canSendDecline}
                  onClick={() => setDecisionConfirm("TRANSPORT_DECLINED")}
                  className="inline-flex h-9 items-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  搬送辞退
                </button>
                <button
                  type="button"
                  disabled={chatSending || !canSendDecide}
                  onClick={() => setDecisionConfirm("TRANSPORT_DECIDED")}
                  className="inline-flex h-9 items-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  搬送決定
                </button>
              </div>
              <label className="block">
                <span className="text-xs font-semibold text-slate-500">A側コメント</span>
                <textarea
                  value={chatNote}
                  onChange={(e) => setChatNote(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="HP側へ送る相談回答を入力してください"
                />
              </label>
              {chatError ? <p className="mt-2 text-sm text-rose-700">{chatError}</p> : null}
              {decisionConfirm ? (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {decisionConfirm === "TRANSPORT_DECIDED" ? "搬送決定を送信しますか？" : "搬送辞退を送信しますか？"}
                  </p>
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={chatSending}
                      onClick={() => setDecisionConfirm(null)}
                      className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      キャンセル
                    </button>
                    <button
                      type="button"
                      disabled={chatSending}
                      onClick={() => void sendDecision(decisionConfirm)}
                      className="inline-flex h-9 items-center rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {chatSending ? "送信中..." : "OK"}
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  disabled={!chatNote.trim() || chatSending}
                  onClick={() => void sendReply()}
                  className="inline-flex h-10 items-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {chatSending ? "送信中..." : "送信"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
