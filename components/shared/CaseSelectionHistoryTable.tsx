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

  if (isDetailed) {
    return (
      <div className="space-y-3">
        {rows.map((item) => (
          <article
            key={item.targetId}
            className="rounded-[24px] bg-white px-4 py-4 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.28)]"
            data-testid={rowTestId}
            data-case-id={rowCaseId}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[15px] font-semibold text-slate-900">{item.hospitalName}</h3>
                  <RequestStatusBadge status={item.status} />
                  {showReplyBadge && item.status === "NEGOTIATING" && item.lastActor === "HP" ? (
                    <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                      {"未返信"}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {item.sentAt ? formatDateTimeMdHm(item.sentAt) : "-"} / {item.requestId}
                </p>
              </div>
              {renderActions ? (
                <div className="w-full max-w-[360px]">
                  {renderActions(item)}
                </div>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.05fr)_minmax(0,1.05fr)]">
              <div className="rounded-[18px] bg-slate-50/85 px-4 py-3">
                <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400">SELECTED DEPARTMENTS</p>
                <p className="mt-2 text-[12px] font-semibold leading-6 text-slate-800">{item.selectedDepartments.join(", ") || "-"}</p>
              </div>
              <div className="rounded-[18px] bg-slate-50/85 px-4 py-3">
                <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400">HOSPITAL COMMENT</p>
                <p className="mt-2 whitespace-pre-wrap text-[12px] leading-6 text-slate-700">{item.latestHpComment || "-"}</p>
              </div>
              <div className="rounded-[18px] bg-slate-50/85 px-4 py-3">
                <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400">EMS REPLY</p>
                <p className="mt-2 whitespace-pre-wrap text-[12px] leading-6 text-slate-700">{item.latestAReply || "-"}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="min-w-[720px] w-full table-fixed text-xs">
        <thead className="bg-slate-50 text-left font-semibold text-slate-500">
          <tr>
            <th className="w-[11%] px-3 py-2">{"\u9001\u4fe1\u65e5\u6642"}</th>
            <th className="w-[18%] px-3 py-2">{"\u75c5\u9662\u540d"}</th>
            <th className="w-[11%] px-2 py-2">{"\u90e8\u9580"}</th>
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
