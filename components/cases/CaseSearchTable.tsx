"use client";

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
  if (row.incidentStatus === "NEGOTIATING" || row.incidentStatus === "要相談" || targets.some((target) => target.status === "NEGOTIATING")) {
    return "CONSULT_CASE";
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
    <div data-testid="ems-cases-table">
      <p className="ems-type-label border-b border-slate-100 bg-slate-50/80 px-5 py-2.5 text-slate-500">案件を選ぶと送信先履歴を展開します</p>
      <div className="space-y-3 bg-slate-50/40 p-3">
          {rows.map((row) => {
            const expanded = Boolean(expandedCaseIds[row.caseId]);
            const targets = sortedTargetsByCaseId[row.caseId] ?? [];
            const targetsLoading = Boolean(targetsLoadingByCaseId[row.caseId]);
            const targetsError = targetsErrorByCaseId[row.caseId] ?? "";
            const parentStatus = deriveParentCaseStatus(row, targets);
            const rowDecisionLocked = parentStatus === "DESTINATION_DECIDED";
            const rowDecisionDisabledReason = rowDecisionLocked ? "搬送先が決まっています。" : decisionDisabledReason;

            return (
              <article
                  key={row.caseId}
                  className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-4 transition hover:border-blue-200 hover:bg-blue-50/25"
                  data-testid="ems-case-row"
                  data-case-id={row.caseId}
                  onClick={() => onToggleExpand(row.caseId)}
                >
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-bold text-slate-950">{row.caseId}</span>
                      {notifiedCaseIds[row.caseId] ? <span className="h-2.5 w-2.5 rounded-full bg-rose-600" aria-label={"未読通知あり"} /> : null}
                        <RequestStatusBadge status={parentStatus} ariaLabelPrefix={"事案ステータス"} />
                        <span className="text-[11px] font-semibold text-slate-500">送信先 {row.requestTargetCount} 件</span>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,0.8fr)_minmax(0,0.7fr)_minmax(0,1.3fr)]">
                        <div>
                          <p className="ems-type-label text-[10px] font-semibold text-slate-400">覚知</p>
                          <p className="ems-type-body mt-1 text-[13px] font-semibold text-slate-800">{[formatAwareDateMd(row.awareDate), row.awareTime].filter(Boolean).join(" ") || "-"}</p>
                        </div>
                        <div>
                          <p className="ems-type-label text-[10px] font-semibold text-slate-400">患者</p>
                          <p className="ems-type-body mt-1 truncate text-[13px] text-slate-800">{row.name || "-"} / {Number.isFinite(row.age) && row.age > 0 ? `${row.age}歳` : "年齢-"}</p>
                        </div>
                        <div>
                          <p className="ems-type-label text-[10px] font-semibold text-slate-400">現場住所</p>
                          <p className="ems-type-body mt-1 line-clamp-2 text-[13px] leading-5 text-slate-700">{row.address || "-"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start justify-end">
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
                    </div>
                  </div>
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                      <div>
                        <p className="ems-type-label text-[10px] font-semibold text-slate-400">搬送先</p>
                        <p className="ems-type-body mt-1 line-clamp-2 text-[13px] leading-5 text-slate-700">{row.destination || "-"}</p>
                      </div>
                      <div>
                        <p className="ems-type-label text-[10px] font-semibold text-slate-400">次の確認</p>
                        <p className="ems-type-body mt-1 text-[13px] leading-5 text-slate-700">{expanded ? "送信先履歴を表示中" : "タップして送信先履歴を確認"}</p>
                      </div>
                    </div>
                  </div>
                  <div className={expanded ? "mt-4" : "hidden"} aria-hidden={!expanded}>
                    <div className={`overflow-hidden transition-all duration-300 ease-out ${expanded ? "max-h-[900px] translate-y-0 opacity-100" : "max-h-0 -translate-y-1 opacity-0"}`}>
                      <div className="rounded-2xl bg-slate-50/90 px-4 py-4">
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
                  </div>
                </article>
            );
          })}
          {!loading && rows.length === 0 ? (
            <div className="ems-type-body rounded-2xl bg-white px-5 py-6 text-slate-500">
                {"条件に一致する事案はありません。"}
            </div>
          ) : null}
      </div>
    </div>
  );
}
