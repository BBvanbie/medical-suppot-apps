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
  caseUid?: string;
  awareDate: string;
  awareTime: string;
  address: string;
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
  disableDecisions?: boolean;
  decisionDisabledReason?: string;
  onToggleExpand: (caseId: string) => void;
  onOpenDetail: (caseId: string) => void;
  onDecision: (caseId: string, target: CaseSearchTableTarget, nextStatus: "TRANSPORT_DECIDED" | "TRANSPORT_DECLINED") => void;
  onConsult: (caseId: string, target: CaseSearchTableTarget) => void;
};

function deriveParentCaseStatus(row: CaseSearchTableRow, targets: CaseSearchTableTarget[]): string {
  if (row.incidentStatus === "TRANSPORT_DECIDED" || row.incidentStatus === "搬送先決定") {
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
  disableDecisions = false,
  decisionDisabledReason,
  onToggleExpand,
  onOpenDetail,
  onDecision,
  onConsult,
}: Props) {
  return (
    <>
      <p className="ems-type-label border-b border-slate-100 bg-slate-50/80 px-5 py-2.5 text-slate-500">行を選ぶと送信先履歴を展開します</p>
      <table className="ems-table w-full table-fixed" data-testid="ems-cases-table">
        <thead className="ems-type-button bg-slate-50/80 text-left font-semibold text-slate-500">
          <tr>
            <th className="w-[14%] px-5 py-3">事案ID</th>
            <th className="w-[13%] px-4 py-3">覚知日時</th>
            <th className="w-[21%] px-4 py-3">現場住所</th>
            <th className="w-[11%] px-4 py-3">患者</th>
            <th className="w-[6%] whitespace-nowrap px-4 py-3">年齢</th>
            <th className="w-[14%] px-4 py-3">進行状況</th>
            <th className="w-[13%] px-4 py-3">搬送先</th>
            <th className="w-[8%] px-5 py-3 text-right">詳細</th>
          </tr>
        </thead>
        <tbody className="text-[13px]">
          {rows.map((row) => {
            const expanded = Boolean(expandedCaseIds[row.caseId]);
            const targets = sortedTargetsByCaseId[row.caseId] ?? [];
            const targetsLoading = Boolean(targetsLoadingByCaseId[row.caseId]);
            const targetsError = targetsErrorByCaseId[row.caseId] ?? "";
            const parentStatus = deriveParentCaseStatus(row, targets);
            const rowDecisionLocked = parentStatus === "DESTINATION_DECIDED";
            const rowDecisionDisabledReason = rowDecisionLocked ? "搬送先が決まっています。" : decisionDisabledReason;

            return (
              <Fragment key={row.caseId}>
                <tr
                  className="cursor-pointer border-t border-slate-100 transition hover:bg-blue-50/35"
                  data-testid="ems-case-row"
                  data-case-id={row.caseId}
                  onClick={() => onToggleExpand(row.caseId)}
                >
                  <td className="px-5 py-3.5 font-semibold text-slate-700">
                    <div className="inline-flex items-center gap-2">
                      <span>{row.caseId}</span>
                      {notifiedCaseIds[row.caseId] ? <span className="h-2.5 w-2.5 rounded-full bg-rose-600" aria-label={"未読通知あり"} /> : null}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700">{[formatAwareDateMd(row.awareDate), row.awareTime].filter(Boolean).join(" ") || "-"}</td>
                  <td className="px-4 py-3.5 text-slate-700">
                    <div className="line-clamp-2 leading-5">{row.address || "-"}</div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700">
                    <div className="truncate">{row.name || "-"}</div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700">{Number.isFinite(row.age) && row.age > 0 ? row.age : "-"}</td>
                  <td className="px-4 py-3.5"><RequestStatusBadge status={parentStatus} ariaLabelPrefix={"事案ステータス"} /></td>
                  <td className="px-4 py-3.5 text-slate-700">
                    <div className="line-clamp-2 leading-5">{row.destination || "-"}</div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenDetail(row.caseId);
                      }}
                      className="ems-type-button inline-flex h-7 min-w-[46px] whitespace-nowrap items-center justify-center rounded-lg bg-[var(--accent-blue)] px-2 text-[10px] font-semibold leading-none text-white transition hover:bg-[color-mix(in_srgb,var(--accent-blue),#000_10%)]"
                    >
                      <span className="whitespace-nowrap text-[10px] leading-none">詳細</span>
                    </button>
                  </td>
                </tr>
                <tr className={expanded ? "border-t border-slate-100" : "hidden"} aria-hidden={!expanded}>
                  <td className="px-0 py-0" colSpan={8}>
                    <div className={`overflow-hidden transition-all duration-300 ease-out ${expanded ? "max-h-[900px] translate-y-0 opacity-100" : "max-h-0 -translate-y-1 opacity-0"}`}>
                      <div className="bg-slate-50/80 px-5 py-4">
                        {(disableDecisions || rowDecisionLocked) && rowDecisionDisabledReason ? (
                          <p className="mb-3 text-xs font-semibold text-amber-700">{rowDecisionDisabledReason}</p>
                        ) : null}
                        {targetsLoading ? (
                          <div className="ems-type-body rounded-2xl bg-white px-4 py-3 text-slate-500">送信先履歴を読み込み中...</div>
                        ) : targetsError ? (
                          <div className="ems-type-body rounded-2xl bg-rose-50 px-4 py-3 text-rose-700">{targetsError}</div>
                        ) : targets.length === 0 ? (
                          <p className="ems-type-body rounded-2xl bg-white px-4 py-3 text-slate-500">
                            {row.requestTargetCount > 0 ? "送信先履歴の表示に失敗しています。再読み込みしてください。" : "送信先履歴はまだありません。"}
                          </p>
                        ) : (
                          <CaseSelectionHistoryTable
                            rows={targets}
                            variant="detailed"
                            rowTestId="ems-case-target-row"
                            rowCaseId={row.caseId}
                            actionHeader={
                              <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-semibold leading-none text-slate-400">
                                <span>操作</span>
                                <span>操作</span>
                                <span>操作</span>
                              </div>
                            }
                            renderActions={(target) => (
                              <div className="grid grid-cols-3 gap-2">
                                <button
                                  type="button"
                                  title={disableDecisions || rowDecisionLocked ? rowDecisionDisabledReason : undefined}
                                  disabled={disableDecisions || rowDecisionLocked || target.status !== "ACCEPTABLE"}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onDecision(row.caseId, target, "TRANSPORT_DECIDED");
                                  }}
                                  className="ems-type-button inline-flex h-9 w-full items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-2 text-[11px] font-semibold leading-none text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                                >
                                  <span className="whitespace-nowrap text-[11px] leading-none">{"搬送決定"}</span>
                                </button>
                                <button
                                  type="button"
                                  title={disableDecisions || rowDecisionLocked ? rowDecisionDisabledReason : undefined}
                                  disabled={disableDecisions || target.status === "TRANSPORT_DECLINED" || (rowDecisionLocked && target.status !== "TRANSPORT_DECIDED")}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onDecision(row.caseId, target, "TRANSPORT_DECLINED");
                                  }}
                                  className="ems-type-button inline-flex h-9 w-full items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-2 text-[11px] font-semibold leading-none text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                                >
                                  <span className="whitespace-nowrap text-[11px] leading-none">{"搬送辞退"}</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={target.status !== "NEGOTIATING"}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onConsult(row.caseId, target);
                                  }}
                                  className="ems-type-button inline-flex h-9 w-full items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-2 text-[11px] font-semibold leading-none text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                                >
                                  <span className="whitespace-nowrap text-[11px] leading-none">{"相談"}</span>
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
                {"条件に一致する事案はありません。"}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </>
  );
}
