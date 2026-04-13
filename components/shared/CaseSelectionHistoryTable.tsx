"use client";

import type { ReactNode } from "react";

import { RequestStatusBadge } from "@/components/shared/RequestStatusBadge";
import type { CaseSelectionHistoryItem } from "@/lib/caseSelectionHistoryTypes";
import { formatDateTimeMdHm } from "@/lib/dateTimeFormat";
import { getHospitalDepartmentPrioritySummary, getHospitalNextActionLabel } from "@/lib/hospitalPriority";

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
            className="ds-panel-surface rounded-[24px] px-4 py-4"
            data-testid={rowTestId}
            data-case-id={rowCaseId}
          >
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[18px] bg-slate-50/80 px-4 py-3">
                <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400">PRIORITY</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {getHospitalDepartmentPrioritySummary(item.selectedDepartments) ?? "通常優先"}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{item.selectedDepartments.join(", ") || "-"}</p>
              </div>
              <div className="rounded-[18px] bg-blue-50/60 px-4 py-3">
                <p className="text-[10px] font-semibold tracking-[0.16em] text-blue-700">NEXT ACTION</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{getHospitalNextActionLabel(item.status)}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">現在状態から次に確認する観点です。</p>
              </div>
              <div className="rounded-[18px] bg-slate-50/80 px-4 py-3">
                <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400">LAST TOUCH</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {item.lastActor === "HP" ? "HP側コメント" : item.lastActor === "A" ? "A側返信" : "送信のみ"}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{item.sentAt ? formatDateTimeMdHm(item.sentAt) : "-"}</p>
              </div>
            </div>

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
              <div className="ds-muted-panel rounded-[18px] px-4 py-3">
                <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400">SELECTED DEPARTMENTS</p>
                <p className="mt-2 text-[12px] font-semibold leading-6 text-slate-800">{item.selectedDepartments.join(", ") || "-"}</p>
              </div>
              <div className="ds-muted-panel rounded-[18px] px-4 py-3">
                <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400">HOSPITAL COMMENT</p>
                <p className="mt-2 whitespace-pre-wrap text-[12px] leading-6 text-slate-700">{item.latestHpComment || "-"}</p>
              </div>
              <div className="ds-muted-panel rounded-[18px] px-4 py-3">
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
    <div className="space-y-3">
      {rows.map((item) => (
        <article
          key={item.targetId}
          className="ds-table-surface rounded-[22px] border border-slate-200 px-4 py-4"
          data-testid={rowTestId}
          data-case-id={rowCaseId}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900">{item.hospitalName}</h3>
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
                {actionHeader ? <div className="mb-2 text-center">{actionHeader}</div> : null}
                {renderActions(item)}
              </div>
            ) : null}
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">SELECTED DEPARTMENTS</p>
              <p className="mt-1 text-xs leading-6 text-slate-700">{item.selectedDepartments.join(", ") || "-"}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
