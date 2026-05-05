import { DispatchTriageAssignmentForm } from "@/components/dispatch/DispatchTriageAssignmentForm";
import { MciIncidentCommandPanel } from "@/components/dispatch/MciIncidentCommandPanel";
import { UserModeBadge } from "@/components/shared/UserModeBadge";
import type { AppMode } from "@/lib/appMode";
import type { DispatchCaseRow } from "@/lib/dispatch/dispatchRepository";

type DispatchCaseBoardVariant = "commandHistory" | "activeCases" | "selectionRequests";

type DispatchCaseBoardProps = {
  rows: DispatchCaseRow[];
  mode: AppMode;
  variant: DispatchCaseBoardVariant;
};

const boardCopy: Record<
  DispatchCaseBoardVariant,
  {
    eyebrow: string;
    title: string;
    description: string;
    kicker: string;
    countLabel: string;
    note: string;
    empty: string;
    showOperationalActions: boolean;
  }
> = {
  commandHistory: {
    eyebrow: "DISPATCH LOG",
    title: "指令一覧",
    description: "本部が起票した指令履歴だけを確認します。進行管理や病院選定は別ページで扱います。",
    kicker: "COMMAND HISTORY",
    countLabel: "指令履歴",
    note: "指令日時、割当隊、住所を時系列で追跡するための履歴面です。",
    empty: "指令履歴はまだありません。",
    showOperationalActions: false,
  },
  activeCases: {
    eyebrow: "ACTIVE CASES",
    title: "事案一覧",
    description: "現在進行形の事案を確認します。TRIAGE本部報告やMCIインシデント化はここから扱います。",
    kicker: "LIVE CASE BOARD",
    countLabel: "進行事案",
    note: "進行中の事案とTRIAGE本部報告を集約し、必要な本部操作へ短く移動します。",
    empty: "進行中の事案はありません。",
    showOperationalActions: true,
  },
  selectionRequests: {
    eyebrow: "SELECTION REQUESTS",
    title: "選定依頼一覧",
    description: "病院選定依頼が発生している事案だけを確認します。受入状況と搬送先指示を優先して処理します。",
    kicker: "REQUEST WORKLIST",
    countLabel: "選定依頼あり",
    note: "病院への依頼・応答・EMSへの搬送先送信を、進行事案から切り出して追跡します。",
    empty: "選定依頼が発生している事案はありません。",
    showOperationalActions: true,
  },
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function DispatchInfoBlock({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="ds-text-2xs font-semibold ds-track-section text-slate-400">{label}</p>
      <p className="mt-1 text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}

function formatAwareDateTime(date: string, time: string) {
  return [date, time].filter(Boolean).join(" ") || "-";
}

function normalizeAssignmentAddress(value: string) {
  return value.replace(/\s+/g, "").trim();
}

export function DispatchCaseBoard({ rows, mode, variant }: DispatchCaseBoardProps) {
  const copy = boardCopy[variant];
  const triageAssignmentTargets = rows
    .filter((row) => row.isTriageDispatchReport)
    .map((row) => ({
      caseId: row.caseId,
      teamName: row.teamName || row.caseId,
      dispatchAddress: row.dispatchAddress,
      destination: row.destination,
    }));

  return (
    <div className="page-frame page-frame--default page-stack page-stack--lg w-full min-w-0">
      <header className="page-hero page-hero--compact border-amber-100/80 bg-amber-50/40">
        <div className="page-hero-grid">
          <div className="page-hero-copy">
            <p className="ds-text-xs-compact font-semibold ds-track-hero text-amber-600">{copy.eyebrow}</p>
            <h1 className="page-hero-title">{copy.title}</h1>
            <div className="page-hero-inline">
              <UserModeBadge mode={mode} />
              <p className="text-sm text-slate-600">{copy.description}</p>
            </div>
          </div>
          <div className="page-hero-aside border-amber-100/80 bg-white">
            <p className="page-hero-kicker">{copy.kicker}</p>
            <div className="page-hero-chip-row">
              <span className="inline-flex rounded-full border border-amber-200/80 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                {rows.length} 件表示
              </span>
              <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                {copy.countLabel}
              </span>
            </div>
            <p className="page-hero-note">{copy.note}</p>
          </div>
        </div>
      </header>

      <section className="space-y-3">
        {rows.map((row) => (
          <article key={row.caseId} className="ds-table-surface ds-radius-panel border border-amber-100/80 px-4 py-4">
            <div className="grid gap-3 xl:ds-grid-fluid-action xl:items-start">
              <div className="min-w-0">
                <p className="text-lg font-bold text-slate-900">
                  {row.teamName || "隊名未設定"}
                  {row.division ? <span className="ml-2 text-sm font-semibold text-amber-700">({row.division})</span> : null}
                  {row.createdFrom === "DISPATCH" ? (
                    <span className="ml-2 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 ds-text-xs-compact font-bold text-amber-700">
                      指令起票
                    </span>
                  ) : row.isTriageDispatchReport ? (
                    <span className="ml-2 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 ds-text-xs-compact font-bold text-rose-700">
                      TRIAGE本部報告
                    </span>
                  ) : row.hasDispatchSelectionRequest ? (
                    <span className="ml-2 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 ds-text-xs-compact font-bold text-amber-700">
                      救命・CCU本部選定
                    </span>
                  ) : (
                    <span className="ml-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 ds-text-xs-compact font-bold text-slate-600">
                      EMS事案
                    </span>
                  )}
                  {row.selectionRequestCount > 0 ? (
                    <span className="ml-2 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 ds-text-xs-compact font-bold text-emerald-700">
                      選定依頼 {row.selectionRequestCount} 件
                    </span>
                  ) : null}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-800">{formatAwareDateTime(row.dispatchDate, row.dispatchTime)}</p>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-700">{row.dispatchAddress || "-"}</p>
              </div>
              <div className="text-right">
                <p className="ds-text-2xs font-semibold ds-track-section text-slate-400">CASE ID</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{row.caseId}</p>
              </div>
            </div>
            <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 md:grid-cols-2">
              <DispatchInfoBlock label="作成日時" value={formatDateTime(row.createdAt)} />
              <DispatchInfoBlock label="管理区分" value={copy.title} />
            </div>
            {copy.showOperationalActions && row.isTriageDispatchReport ? (() => {
              const rowAddressKey = normalizeAssignmentAddress(row.dispatchAddress);
              const scopedTargets = triageAssignmentTargets.filter((target) => {
                if (!rowAddressKey) return target.caseId === row.caseId;
                return normalizeAssignmentAddress(target.dispatchAddress) === rowAddressKey;
              });
              return (
                <>
                  <MciIncidentCommandPanel caseId={row.caseId} dispatchAddress={row.dispatchAddress} />
                  <DispatchTriageAssignmentForm
                    caseId={row.caseId}
                    dispatchAddress={row.dispatchAddress}
                    initialDestination={row.destination}
                    assignmentTargets={scopedTargets}
                    flow="triage"
                  />
                </>
              );
            })() : null}
            {copy.showOperationalActions && !row.isTriageDispatchReport && row.hasDispatchSelectionRequest ? (
              <DispatchTriageAssignmentForm
                caseId={row.caseId}
                dispatchAddress={row.dispatchAddress}
                initialDestination={row.destination}
                assignmentTargets={[{
                  caseId: row.caseId,
                  teamName: row.teamName || row.caseId,
                  dispatchAddress: row.dispatchAddress,
                  destination: row.destination,
                }]}
                initialDepartments={row.dispatchSelectionDepartments}
                flow="criticalCare"
              />
            ) : null}
          </article>
        ))}
        {rows.length === 0 ? (
          <div className="ds-table-surface ds-radius-panel border border-amber-100/80 px-4 py-8 text-center text-sm text-slate-500">
            {copy.empty}
          </div>
        ) : null}
      </section>
    </div>
  );
}
