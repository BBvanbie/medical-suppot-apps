"use client";

import { ArrowPathIcon } from "@heroicons/react/24/outline";

import { RequestStatusBadge } from "@/components/shared/RequestStatusBadge";
import { formatDateTimeMdHm } from "@/lib/dateTimeFormat";

type SendHistoryItem = {
  targetId: number;
  requestId: string;
  caseId: string;
  sentAt: string;
  status?: "未読" | "既読" | "要相談" | "受入可能" | "受入不可" | "搬送決定" | "搬送辞退" | "辞退";
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
  refreshing?: boolean;
  decisionPendingByRequest: Record<string, boolean>;
  onRefresh?: () => void;
  onSelectDecision: (decision: DecisionConfirm) => void;
  onOpenConsult: (item: SendHistoryItem) => void;
};

export function CaseSendHistoryTable({
  readOnly,
  sendHistory,
  refreshing = false,
  decisionPendingByRequest,
  onRefresh,
  onSelectDecision,
  onOpenConsult,
}: CaseSendHistoryTableProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">送信履歴</h2>
          <p className="mt-2 text-sm text-slate-500">送信済み病院のステータス、相談状況、搬送判断を確認できます。</p>
        </div>
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
            <span>{refreshing ? "更新中..." : "更新"}</span>
          </button>
        ) : null}
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-[1080px] table-fixed text-xs text-slate-700">
          <thead className="bg-slate-50 text-left text-[11px] font-semibold text-slate-500">
            <tr>
              <th className="px-4 py-3">送信日時</th>
              <th className="px-4 py-3">病院</th>
              <th className="px-4 py-3">ステータス</th>
              <th className="px-4 py-3">選定科目</th>
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
                <tr key={`${item.requestId}-${item.targetId}`} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-2.5 text-slate-700">{formatDateTimeMdHm(item.sentAt)}</td>
                  <td className="w-[18%] px-3 py-2.5 text-slate-700">
                    <div className="whitespace-normal break-words leading-5">{item.hospitalName ?? "-"}</div>
                  </td>
                  <td className="w-[12%] px-3 py-2.5">
                    <RequestStatusBadge status={item.status} />
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">
                    <div className="whitespace-normal break-words leading-5">{item.selectedDepartments?.join(", ") || "-"}</div>
                  </td>
                  <td className="w-[13%] px-3 py-2.5 text-slate-700">
                    <div className="whitespace-normal break-words leading-5">{item.consultComment || "-"}</div>
                  </td>
                  <td className="w-[13%] px-3 py-2.5 text-slate-700">
                    <div className="whitespace-normal break-words leading-5">{item.emsReplyComment || "-"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        disabled={readOnly || !item.targetId || !canDecide || item.status === "搬送決定" || item.status === "搬送辞退" || item.status === "辞退" || pending}
                        onClick={() => onSelectDecision({ targetId: item.targetId, action: "TRANSPORT_DECIDED" })}
                        className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        搬送決定
                      </button>
                      <button
                        type="button"
                        disabled={readOnly || !item.targetId || !canDecline || item.status === "搬送決定" || item.status === "搬送辞退" || item.status === "辞退" || pending}
                        onClick={() => onSelectDecision({ targetId: item.targetId, action: "TRANSPORT_DECLINED" })}
                        className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        搬送辞退
                      </button>
                      <button
                        type="button"
                        disabled={readOnly || !item.targetId || !item.canConsult}
                        onClick={() => onOpenConsult(item)}
                        className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
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
                <td className="px-3 py-6 text-sm text-slate-500" colSpan={7}>
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

