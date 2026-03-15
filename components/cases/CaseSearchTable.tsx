"use client";

import { Fragment } from "react";

import { CaseSelectionHistoryTable } from "@/components/shared/CaseSelectionHistoryTable";
import { RequestStatusBadge } from "@/components/shared/RequestStatusBadge";
import { formatAwareDateMd } from "@/lib/dateTimeFormat";

type RequestStatus =
  | "UNREAD"
  | "READ"
  | "NEGOTIATING"
  | "ACCEPTABLE"
  | "NOT_ACCEPTABLE"
  | "TRANSPORT_DECIDED"
  | "TRANSPORT_DECLINED";

export type CaseSearchTableTarget = {
  targetId: number;
  requestId: string;
  sentAt: string;
  hospitalName: string;
  status: RequestStatus;
  updatedAt: string;
  lastActor: "A" | "HP" | null;
  selectedDepartments: string[];
  latestHpComment: string | null;
  latestAReply: string | null;
};

export type CaseSearchTableRow = {
  caseId: string;
  awareDate: string;
  awareTime: string;
  municipality?: string;
  name: string;
  age: number;
  destination?: string | null;
  incidentStatus: string;
  requestTargetCount: number;
};

type Props = {
  rows: CaseSearchTableRow[];
  loading: boolean;
  notifiedCaseIds: Record<string, boolean>;
  expandedCaseIds: Record<string, boolean>;
  sortedTargetsByCaseId: Record<string, CaseSearchTableTarget[]>;
  targetsLoadingByCaseId: Record<string, boolean>;
  targetsErrorByCaseId: Record<string, string>;
  onToggleExpand: (caseId: string) => void;
  onOpenDetail: (caseId: string) => void;
  onDecision: (caseId: string, target: CaseSearchTableTarget, nextStatus: "TRANSPORT_DECIDED" | "TRANSPORT_DECLINED") => void;
  onConsult: (caseId: string, target: CaseSearchTableTarget) => void;
};

function deriveParentCaseStatus(row: CaseSearchTableRow, targets: CaseSearchTableTarget[]): string {
  if (row.incidentStatus === "TRANSPORT_DECIDED" || row.incidentStatus === "\u642c\u9001\u5148\u6c7a\u5b9a") {
    return "DESTINATION_DECIDED";
  }
  if (targets.some((target) => target.status === "TRANSPORT_DECIDED")) {
    return "DESTINATION_DECIDED";
  }
  if (row.requestTargetCount > 0) {
    return "SELECTION_IN_PROGRESS";
  }
  return "SELECTION_PENDING";
}

export function CaseSearchTable({
  rows,
  loading,
  notifiedCaseIds,
  expandedCaseIds,
  sortedTargetsByCaseId,
  targetsLoadingByCaseId,
  targetsErrorByCaseId,
  onToggleExpand,
  onOpenDetail,
  onDecision,
  onConsult,
}: Props) {
  return (
    <>
      <p className="ems-type-label border-b border-slate-200 bg-slate-50 px-4 py-2 text-slate-500">{"\u884c\u3092\u30bf\u30c3\u30d7\u3059\u308c\u3070\u5c55\u958b\u3057\u307e\u3059"}</p>
      <table className="ems-table w-full table-fixed" data-testid="ems-cases-table">
        <thead className="ems-type-button bg-slate-50 text-left font-semibold text-slate-500">
          <tr>
            <th className="w-[16%] px-4 py-3">{"\u4e8b\u6848ID"}</th>
            <th className="w-[13%] px-4 py-3">{"\u899a\u77e5\u65e5\u6642"}</th>
            <th className="w-[10%] px-4 py-3">{"\u5e02\u533a\u540d"}</th>
            <th className="w-[11%] px-4 py-3">{"\u6c0f\u540d"}</th>
            <th className="w-[7%] px-4 py-3">{"\u5e74\u9f62"}</th>
            <th className="w-[18%] px-4 py-3">{"\u30b9\u30c6\u30fc\u30bf\u30b9"}</th>
            <th className="w-[17%] px-4 py-3">{"\u642c\u9001\u5148"}</th>
            <th className="w-[8%] px-4 py-3 text-right">{"\u8a73\u7d30"}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const expanded = Boolean(expandedCaseIds[row.caseId]);
            const targets = sortedTargetsByCaseId[row.caseId] ?? [];
            const targetsLoading = Boolean(targetsLoadingByCaseId[row.caseId]);
            const targetsError = targetsErrorByCaseId[row.caseId] ?? "";
            const parentStatus = deriveParentCaseStatus(row, targets);

            return (
              <Fragment key={row.caseId}>
                <tr
                  className="cursor-pointer border-t border-slate-100 transition hover:bg-blue-50/40"
                  data-testid="ems-case-row"
                  data-case-id={row.caseId}
                  onClick={() => onToggleExpand(row.caseId)}
                >
                  <td className="px-4 py-3 font-semibold text-slate-700">
                    <div className="inline-flex items-center gap-2">
                      <span>{row.caseId}</span>
                      {notifiedCaseIds[row.caseId] ? <span className="h-2.5 w-2.5 rounded-full bg-rose-600" aria-label={"\u672a\u8aad\u901a\u77e5\u3042\u308a"} /> : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{[formatAwareDateMd(row.awareDate), row.awareTime].filter(Boolean).join(" ") || "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{row.municipality || "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{row.name || "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{Number.isFinite(row.age) ? row.age : "-"}</td>
                  <td className="px-4 py-3"><RequestStatusBadge status={parentStatus} ariaLabelPrefix={"\u4e8b\u6848\u30b9\u30c6\u30fc\u30bf\u30b9"} /></td>
                  <td className="px-4 py-3 text-slate-700">{row.destination || "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenDetail(row.caseId);
                      }}
                      className="ems-type-button inline-flex h-14 w-10 flex-col items-center justify-center rounded-xl bg-[var(--accent-blue)] text-[11px] font-semibold leading-[1.05] text-white transition hover:bg-[color-mix(in_srgb,var(--accent-blue),#000_10%)]"
                    >
                      <span>{"\u8a73"}</span>
                      <span>{"\u7d30"}</span>
                    </button>
                  </td>
                </tr>
                <tr className="border-t border-slate-100">
                  <td className="px-0 py-0" colSpan={8}>
                    <div className={`overflow-hidden transition-all duration-300 ease-out ${expanded ? "max-h-[900px] translate-y-0 opacity-100" : "max-h-0 -translate-y-1 opacity-0"}`}>
                      <div className="bg-slate-50 px-4 py-3">
                        {targetsLoading ? (
                          <div className="ems-type-body rounded-lg border border-slate-200 bg-white px-3 py-3 text-slate-500">{"\u9001\u4fe1\u5148\u5c65\u6b74\u3092\u8aad\u307f\u8fbc\u307f\u4e2d..."}</div>
                        ) : targetsError ? (
                          <div className="ems-type-body rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 text-rose-700">{targetsError}</div>
                        ) : targets.length === 0 ? (
                          <p className="ems-type-body rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-500">
                            {row.requestTargetCount > 0 ? "\u9001\u4fe1\u5148\u5c65\u6b74\u306e\u8868\u793a\u306b\u5931\u6557\u3057\u3066\u3044\u307e\u3059\u3002\u518d\u8aad\u307f\u8fbc\u307f\u3057\u3066\u304f\u3060\u3055\u3044\u3002" : "\u9001\u4fe1\u5148\u5c65\u6b74\u306f\u307e\u3060\u3042\u308a\u307e\u305b\u3093\u3002"}
                          </p>
                        ) : (
                          <CaseSelectionHistoryTable
                            rows={targets}
                            variant="detailed"
                            rowTestId="ems-case-target-row"
                            rowCaseId={row.caseId}
                            actionHeader={
                              <div className="grid grid-cols-3 gap-1 text-center text-[10px] leading-tight">
                                <span>{"\u642c\u9001\u6c7a\u5b9a"}</span>
                                <span>{"\u642c\u9001\u8f9e\u9000"}</span>
                                <span>{"\u76f8\u8ac7"}</span>
                              </div>
                            }
                            renderActions={(target) => (
                              <div className="grid grid-cols-3 gap-1">
                                <button
                                  type="button"
                                  disabled={target.status !== "ACCEPTABLE"}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onDecision(row.caseId, target, "TRANSPORT_DECIDED");
                                  }}
                                  className="ems-type-button inline-flex h-11 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-1 text-[11px] font-semibold leading-tight text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                                >
                                  <span>{"\u6c7a\u5b9a"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onDecision(row.caseId, target, "TRANSPORT_DECLINED");
                                  }}
                                  className="ems-type-button inline-flex h-11 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-1 text-[11px] font-semibold leading-tight text-rose-700 transition hover:bg-rose-100"
                                >
                                  <span>{"\u8f9e\u9000"}</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={target.status !== "NEGOTIATING"}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onConsult(row.caseId, target);
                                  }}
                                  className="ems-type-button inline-flex h-11 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-1 text-[11px] font-semibold leading-tight text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                                >
                                  <span>{"\u76f8\u8ac7"}</span>
                                </button>
                              </div>
                            )}
                          />
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              </Fragment>
            );
          })}
          {!loading && rows.length === 0 ? (
            <tr>
              <td className="ems-type-body px-5 py-6 text-slate-500" colSpan={8}>
                {"\u6761\u4ef6\u306b\u4e00\u81f4\u3059\u308b\u4e8b\u6848\u306f\u3042\u308a\u307e\u305b\u3093\u3002"}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </>
  );
}
