"use client";

import type { ReactNode } from "react";

import { RequestStatusBadge } from "@/components/shared/RequestStatusBadge";
import type { CaseSelectionHistoryItem } from "@/lib/caseSelectionHistoryTypes";
import { formatDateTimeMdHm } from "@/lib/dateTimeFormat";

type CaseSelectionHistoryTableProps = {
  rows: CaseSelectionHistoryItem[];
  variant: "compact" | "detailed";
  actionHeader?: ReactNode;
  renderActions?: (item: CaseSelectionHistoryItem) => ReactNode;
  rowTestId?: string;
  rowCaseId?: string;
  showReplyBadge?: boolean;
};

export function CaseSelectionHistoryTable({
  rows,
  variant,
  actionHeader,
  renderActions,
  rowTestId,
  rowCaseId,
  showReplyBadge = false,
}: CaseSelectionHistoryTableProps) {
  const isDetailed = variant === "detailed";

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className={`${isDetailed ? "min-w-[980px]" : "min-w-[720px]"} w-full table-fixed text-xs`}>
        <thead className="bg-slate-50 text-left font-semibold text-slate-500">
          <tr>
            <th className="px-3 py-2">送信日時</th>
            <th className="px-3 py-2">病院名</th>
            <th className="px-3 py-2">{isDetailed ? "選定科目" : "部門"}</th>
            {isDetailed ? <th className="px-3 py-2">最新病院コメント</th> : null}
            {isDetailed ? <th className="px-3 py-2">救急隊返信</th> : null}
            <th className="px-3 py-2">ステータス</th>
            {renderActions ? <th className="px-3 py-2 text-right">{actionHeader}</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.targetId} className="border-t border-slate-100" data-testid={rowTestId} data-case-id={rowCaseId}>
              <td className="px-3 py-2 text-slate-700">{item.sentAt ? formatDateTimeMdHm(item.sentAt) : "-"}</td>
              <td className="px-3 py-2 font-semibold text-slate-800">{item.hospitalName}</td>
              <td className="px-3 py-2 text-slate-700">{item.selectedDepartments.join(", ") || "-"}</td>
              {isDetailed ? <td className="px-3 py-2 text-slate-700">{item.latestHpComment || "-"}</td> : null}
              {isDetailed ? <td className="px-3 py-2 text-slate-700">{item.latestAReply || "-"}</td> : null}
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <RequestStatusBadge status={item.status} />
                  {showReplyBadge && item.status === "NEGOTIATING" && item.lastActor === "HP" ? (
                    <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                      未返信
                    </span>
                  ) : null}
                </div>
              </td>
              {renderActions ? <td className="px-3 py-2 text-right">{renderActions(item)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
