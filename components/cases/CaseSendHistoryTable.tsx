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
  disableDecisions?: boolean;
  decisionDisabledReason?: string;
  decidedTargetId?: number | null;
  sendHistory: SendHistoryItem[];
  refreshing?: boolean;
  decisionPendingByRequest: Record<string, boolean>;
  onRefresh?: () => void;
  onSelectDecision: (decision: DecisionConfirm) => void;
  onOpenConsult: (item: SendHistoryItem) => void;
};

type HistoryCellProps = {
  label: string;
  value: string;
};

function HistoryCell({ label, value }: HistoryCellProps) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-slate-700">{value}</p>
    </div>
  );
}

export function CaseSendHistoryTable({
  readOnly,
  disableDecisions = false,
  decisionDisabledReason,
  decidedTargetId = null,
  sendHistory,
  refreshing = false,
  decisionPendingByRequest,
  onRefresh,
  onSelectDecision,
  onOpenConsult,
}: CaseSendHistoryTableProps) {
  return (
    <section className="rounded-[26px] bg-white px-5 py-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.22)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] text-slate-400">SEND HISTORY</p>
          <h2 className="mt-1 text-base font-bold tracking-tight text-slate-900">送信履歴</h2>
          <p className="mt-2 text-[12px] leading-6 text-slate-500">送信先、返答状況、相談の往復、搬送判断を同じ面で確認します。</p>
          {((disableDecisions || decidedTargetId !== null) && decisionDisabledReason) ? (
            <p className="mt-2 text-xs font-semibold text-amber-700">{decisionDisabledReason}</p>
          ) : null}
        </div>
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-slate-100 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
            <span>{refreshing ? "更新中..." : "更新"}</span>
          </button>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        {sendHistory.map((item) => {
          const canDecide = Boolean(item.canDecide);
          const canDecline = canDecide || item.status === "要相談" || item.status === "搬送決定";
          const pending = Boolean(decisionPendingByRequest[String(item.targetId)]);
          const decideLockedByDecision = decidedTargetId !== null;
          const declineLockedByDecision = decidedTargetId !== null && decidedTargetId !== item.targetId;
          const decideDisabled = disableDecisions || readOnly || !item.targetId || !canDecide || item.status === "搬送決定" || item.status === "搬送辞退" || item.status === "辞退" || pending || decideLockedByDecision;
          const declineDisabled = disableDecisions || readOnly || !item.targetId || !canDecline || item.status === "搬送辞退" || item.status === "辞退" || pending || declineLockedByDecision;
          const decisionTitle = disableDecisions || decideLockedByDecision ? decisionDisabledReason : undefined;
          const declineTitle = disableDecisions || declineLockedByDecision ? decisionDisabledReason : undefined;

          return (
            <article key={`${item.requestId}-${item.targetId}`} className="rounded-[22px] bg-slate-50/90 px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[14px] font-semibold text-slate-900">{item.hospitalName ?? "-"}</h3>
                    <RequestStatusBadge status={item.status} />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">{formatDateTimeMdHm(item.sentAt)} / {item.requestId}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    title={decisionTitle}
                    disabled={decideDisabled}
                    onClick={() => onSelectDecision({ targetId: item.targetId, action: "TRANSPORT_DECIDED" })}
                    className="inline-flex h-9 items-center rounded-full bg-blue-50 px-3 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    搬送決定
                  </button>
                  <button
                    type="button"
                    title={declineTitle}
                    disabled={declineDisabled}
                    onClick={() => onSelectDecision({ targetId: item.targetId, action: "TRANSPORT_DECLINED" })}
                    className="inline-flex h-9 items-center rounded-full bg-rose-50 px-3 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    搬送辞退
                  </button>
                  <button
                    type="button"
                    disabled={readOnly || !item.targetId || !item.canConsult}
                    onClick={() => onOpenConsult(item)}
                    className="inline-flex h-9 items-center rounded-full bg-amber-50 px-3 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    相談
                  </button>
                </div>
              </div>

              <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.95fr)_minmax(0,0.95fr)]">
                <HistoryCell label="選定科目" value={item.selectedDepartments?.join(", ") || "-"} />
                <HistoryCell label="病院コメント" value={item.consultComment || "-"} />
                <HistoryCell label="救急隊コメント" value={item.emsReplyComment || "-"} />
              </div>
            </article>
          );
        })}

        {sendHistory.length === 0 ? (
          <div className="rounded-[22px] bg-slate-50/90 px-4 py-5 text-sm text-slate-500">送信履歴はまだありません。</div>
        ) : null}
      </div>
    </section>
  );
}
