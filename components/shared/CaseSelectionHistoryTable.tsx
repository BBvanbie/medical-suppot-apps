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
            className="ds-panel-surface ds-radius-panel px-4 py-4"
            data-testid={rowTestId}
            data-case-id={rowCaseId}
          >
            <div className="grid gap-3 md:grid-cols-3">
              <div className="ds-radius-callout bg-slate-50/80 px-4 py-3">
                <p className="ds-text-2xs font-semibold ds-track-eyebrow text-slate-400">PRIORITY</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {getHospitalDepartmentPrioritySummary(item.selectedDepartments) ?? "通常優先"}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{item.selectedDepartments.join(", ") || "-"}</p>
              </div>
              <div className="ds-radius-callout bg-blue-50/60 px-4 py-3">
                <p className="ds-text-2xs font-semibold ds-track-eyebrow text-blue-700">NEXT ACTION</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{getHospitalNextActionLabel(item.status)}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">現在状態から次に確認する観点です。</p>
              </div>
              <div className="ds-radius-callout bg-slate-50/80 px-4 py-3">
                <p className="ds-text-2xs font-semibold ds-track-eyebrow text-slate-400">LAST TOUCH</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {item.lastActor === "HP" ? "HP側コメント" : item.lastActor === "A" ? "A側返信" : "送信のみ"}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{item.sentAt ? formatDateTimeMdHm(item.sentAt) : "-"}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="ds-text-md font-semibold text-slate-900">{item.hospitalName}</h3>
                  <RequestStatusBadge status={item.status} />
                  {showReplyBadge && item.status === "NEGOTIATING" && item.lastActor === "HP" ? (
                    <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 ds-text-2xs font-bold text-rose-700">
                      {"未返信"}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 ds-text-xs-compact text-slate-500">
                  {item.sentAt ? formatDateTimeMdHm(item.sentAt) : "-"} / {item.requestId}
                </p>
              </div>
              {renderActions ? (
                <div className="w-full ds-max-w-panel">
                  {renderActions(item)}
                </div>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 ds-grid-lg-summary-triad">
              <div className="ds-muted-panel ds-radius-callout px-4 py-3">
                <p className="ds-text-2xs font-semibold ds-track-eyebrow text-slate-400">SELECTED DEPARTMENTS</p>
                <p className="mt-2 ds-text-xs-plus font-semibold leading-6 text-slate-800">{item.selectedDepartments.join(", ") || "-"}</p>
              </div>
              <div className="ds-muted-panel ds-radius-callout px-4 py-3">
                <p className="ds-text-2xs font-semibold ds-track-eyebrow text-slate-400">HOSPITAL COMMENT</p>
                <p className="mt-2 whitespace-pre-wrap ds-text-xs-plus leading-6 text-slate-700">{item.latestHpComment || "-"}</p>
              </div>
              <div className="ds-muted-panel ds-radius-callout px-4 py-3">
                <p className="ds-text-2xs font-semibold ds-track-eyebrow text-slate-400">EMS REPLY</p>
                <p className="mt-2 whitespace-pre-wrap ds-text-xs-plus leading-6 text-slate-700">{item.latestAReply || "-"}</p>
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
          className="ds-table-surface ds-radius-command border border-slate-200 px-4 py-4"
          data-testid={rowTestId}
          data-case-id={rowCaseId}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900">{item.hospitalName}</h3>
                <RequestStatusBadge status={item.status} />
                {showReplyBadge && item.status === "NEGOTIATING" && item.lastActor === "HP" ? (
                  <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 ds-text-2xs font-bold text-rose-700">
                    {"未返信"}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 ds-text-xs-compact text-slate-500">
                {item.sentAt ? formatDateTimeMdHm(item.sentAt) : "-"} / {item.requestId}
              </p>
            </div>
            {renderActions ? (
              <div className="w-full ds-max-w-panel">
                {actionHeader ? <div className="mb-2 text-center">{actionHeader}</div> : null}
                {renderActions(item)}
              </div>
            ) : null}
          </div>

          <div className="mt-3 grid gap-3 md:ds-grid-fluid-action">
            <div className="min-w-0">
              <p className="ds-text-2xs font-semibold ds-track-section text-slate-400">SELECTED DEPARTMENTS</p>
              <p className="mt-1 text-xs leading-6 text-slate-700">{item.selectedDepartments.join(", ") || "-"}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
