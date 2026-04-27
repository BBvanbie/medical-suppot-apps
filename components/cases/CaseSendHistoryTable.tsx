"use client";

import { ArrowPathIcon } from "@heroicons/react/24/outline";

import { RequestStatusBadge } from "@/components/shared/RequestStatusBadge";
import { SectionPanelFrame } from "@/components/shared/SectionPanelFrame";
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
  acceptedCapacity?: number | null;
};

type DecisionConfirm = {
  targetId: number;
  action: "TRANSPORT_DECIDED" | "TRANSPORT_DECLINED";
};

type CaseSendHistoryTableProps = {
  readOnly?: boolean;
  operationalMode?: "STANDARD" | "TRIAGE";
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
  operationalMode = "STANDARD",
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
  const isTriage = operationalMode === "TRIAGE";
  return (
    <SectionPanelFrame
      kicker="SEND HISTORY"
      title="送信履歴"
      description={
        <>
          送信先、返答状況、相談の往復、搬送判断を同じ面で確認します。
          {((disableDecisions || decidedTargetId !== null) && decisionDisabledReason) ? (
            <span className="mt-2 block text-xs font-semibold text-amber-700">{decisionDisabledReason}</span>
          ) : null}
        </>
      }
      actions={
        onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-slate-100 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
            <span>{refreshing ? "更新中..." : "更新"}</span>
          </button>
        ) : null
      }
      className={isTriage ? "rounded-3xl border border-rose-200 bg-white p-5 shadow-[0_18px_40px_-28px_rgba(190,24,93,0.2)]" : undefined}
      titleClassName={isTriage ? "text-lg font-bold text-slate-900" : undefined}
      descriptionClassName={isTriage ? "mt-1 text-sm text-rose-800" : undefined}
      bodyClassName="mt-4"
    >
      <div className="space-y-3">
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
            <article key={`${item.requestId}-${item.targetId}`} className={`rounded-[22px] px-4 py-4 ${isTriage ? "border border-rose-100 bg-rose-50/55" : "bg-slate-50/90"}`}>
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
                    className={`inline-flex h-9 items-center rounded-full px-3 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${isTriage ? "bg-rose-600 text-white hover:bg-rose-500" : "bg-blue-50 text-blue-700 hover:bg-blue-100"}`}
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
                <HistoryCell
                  label="病院コメント"
                  value={[
                    item.acceptedCapacity != null ? `受入可能 ${item.acceptedCapacity}名` : "",
                    item.consultComment || "",
                  ].filter(Boolean).join(" / ") || "-"}
                />
                <HistoryCell label="救急隊コメント" value={item.emsReplyComment || "-"} />
              </div>
            </article>
          );
        })}

        {sendHistory.length === 0 ? (
          <div className="rounded-[22px] bg-slate-50/90 px-4 py-5 text-sm text-slate-500">送信履歴はまだありません。</div>
        ) : null}
      </div>
    </SectionPanelFrame>
  );
}
