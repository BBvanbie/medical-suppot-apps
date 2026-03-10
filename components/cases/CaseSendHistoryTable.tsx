"use client";

import { RequestStatusBadge } from "@/components/shared/RequestStatusBadge";
import { formatDateTimeMdHm } from "@/lib/dateTimeFormat";

type SendHistoryItem = {
  targetId: number;
  requestId: string;
  caseId: string;
  sentAt: string;
  status?: "未読" | "既読" | "要相談" | "受入可能" | "受入不可" | "搬送決定" | "辞退";
  hospitalName?: string;
  selectedDepartments?: string[];
  canDecide?: boolean;
  canConsult?: boolean;
  consultComment?: string;
  emsReplyComment?: string;
};

type DecisionConfirm = {
  targetId: number;
  action: "TRANSPORT_DECIDED" | "TRANSPORT_DECLINED";
};

type CaseSendHistoryTableProps = {
  readOnly?: boolean;
  sendHistory: SendHistoryItem[];
  decisionPendingByRequest: Record<string, boolean>;
  onSelectDecision: (decision: DecisionConfirm) => void;
  onOpenConsult: (item: SendHistoryItem) => void;
};

export function CaseSendHistoryTable({
  readOnly,
  sendHistory,
  decisionPendingByRequest,
  onSelectDecision,
  onOpenConsult,
}: CaseSendHistoryTableProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
      <h2 className="text-lg font-bold text-slate-800">送信履歴</h2>
      <p className="mt-2 text-sm text-slate-500">この事案で送信した受入要請履歴を表示します。</p>
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-[980px] table-fixed text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
            <tr>
              <th className="px-4 py-3">送信時刻</th>
              <th className="px-4 py-3">病院</th>
              <th className="px-4 py-3">ステータス</th>
              <th className="px-4 py-3">選択科目</th>
              <th className="px-4 py-3">病院コメント</th>
              <th className="px-4 py-3">救急隊コメント</th>
              <th className="px-4 py-3">搬送判断</th>
            </tr>
          </thead>
          <tbody>
            {sendHistory.map((item) => {
              const canDecide = Boolean(item.canDecide);
              const canDecline = canDecide || item.status === "要相談";
              const pending = Boolean(decisionPendingByRequest[String(item.targetId)]);
              return (
                <tr key={`${item.requestId}-${item.targetId}`} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-700">{formatDateTimeMdHm(item.sentAt)}</td>
                  <td className="px-4 py-3 text-slate-700">{item.hospitalName ?? "-"}</td>
                  <td className="px-4 py-3">
                    <RequestStatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-700">{item.selectedDepartments?.join(", ") || "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{item.consultComment || "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{item.emsReplyComment || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={readOnly || !item.targetId || !canDecide || item.status === "搬送決定" || item.status === "辞退" || pending}
                        onClick={() => onSelectDecision({ targetId: item.targetId, action: "TRANSPORT_DECIDED" })}
                        className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        搬送決定
                      </button>
                      <button
                        type="button"
                        disabled={readOnly || !item.targetId || !canDecline || item.status === "搬送決定" || item.status === "辞退" || pending}
                        onClick={() => onSelectDecision({ targetId: item.targetId, action: "TRANSPORT_DECLINED" })}
                        className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        搬送辞退
                      </button>
                      <button
                        type="button"
                        disabled={readOnly || !item.targetId || !item.canConsult}
                        onClick={() => onOpenConsult(item)}
                        className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        相談
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {sendHistory.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-slate-500" colSpan={7}>
                  送信履歴はまだありません。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
