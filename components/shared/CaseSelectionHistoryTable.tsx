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
      <table className={`${isDetailed ? "min-w-[920px]" : "min-w-[720px]"} w-full table-fixed text-xs`}>
        <thead className="bg-slate-50 text-left font-semibold text-slate-500">
          <tr>
            <th className="w-[11%] px-3 py-2">{"\u9001\u4fe1\u65e5\u6642"}</th>
            <th className="w-[18%] px-3 py-2">{"\u75c5\u9662\u540d"}</th>
            <th className="w-[11%] px-2 py-2">{isDetailed ? "\u9078\u5b9a\u79d1\u76ee" : "\u90e8\u9580"}</th>
            {isDetailed ? <th className="w-[21%] px-3 py-2">{"\u6700\u65b0\u75c5\u9662\u30b3\u30e1\u30f3\u30c8"}</th> : null}
            {isDetailed ? <th className="w-[13%] px-3 py-2">{"\u6551\u6025\u968a\u8fd4\u4fe1"}</th> : null}
            <th className="w-[14%] px-3 py-2">{"\u30b9\u30c6\u30fc\u30bf\u30b9"}</th>
            {renderActions ? <th className="w-[12%] px-2 py-2 text-center">{actionHeader}</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.targetId} className="border-t border-slate-100" data-testid={rowTestId} data-case-id={rowCaseId}>
              <td className="px-3 py-2 text-slate-700">{item.sentAt ? formatDateTimeMdHm(item.sentAt) : "-"}</td>
              <td className="px-3 py-2 font-semibold text-slate-800">{item.hospitalName}</td>
              <td className="px-2 py-2 text-slate-700">{item.selectedDepartments.join(", ") || "-"}</td>
              {isDetailed ? <td className="px-3 py-2 text-slate-700">{item.latestHpComment || "-"}</td> : null}
              {isDetailed ? <td className="px-3 py-2 text-slate-700">{item.latestAReply || "-"}</td> : null}
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <RequestStatusBadge status={item.status} />
                  {showReplyBadge && item.status === "NEGOTIATING" && item.lastActor === "HP" ? (
                    <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                      {"\u672a\u8fd4\u4fe1"}
                    </span>
                  ) : null}
                </div>
              </td>
              {renderActions ? <td className="px-2 py-2 align-middle text-center">{renderActions(item)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
