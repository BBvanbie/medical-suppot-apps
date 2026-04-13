"use client";

import { RequestStatusBadge } from "@/components/shared/RequestStatusBadge";
import { getHospitalDepartmentPrioritySummary, getHospitalNextActionLabel } from "@/lib/hospitalPriority";

type HospitalPatientFollowUpSummaryProps = {
  status: string;
  selectedDepartments: string[];
  requestId: string;
  caseId: string;
  teamName?: string | null;
};

export function HospitalPatientFollowUpSummary({
  status,
  selectedDepartments,
  requestId,
  caseId,
  teamName,
}: HospitalPatientFollowUpSummaryProps) {
  const prioritySummary = getHospitalDepartmentPrioritySummary(selectedDepartments);
  const nextActionLabel = getHospitalNextActionLabel(status);

  return (
    <section className="ds-panel-surface rounded-2xl p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">FOLLOW-UP CHECK</p>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl bg-emerald-50/70 px-4 py-4">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-emerald-700">CURRENT STATUS</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <RequestStatusBadge status={status} />
            {prioritySummary ? (
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                {prioritySummary}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-600">{selectedDepartments.join(", ") || "診療科未設定"}</p>
        </div>
        <div className="rounded-2xl bg-blue-50/70 px-4 py-4">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-blue-700">NEXT ACTION</p>
          <p className="mt-2 text-base font-bold text-slate-900">{nextActionLabel}</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">受入後の継続確認で先に見るべき観点です。</p>
        </div>
        <div className="rounded-2xl bg-slate-50/90 px-4 py-4">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-500">TRACKING CONTEXT</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{caseId}</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            {requestId}
            {teamName ? ` / ${teamName}` : ""}
          </p>
        </div>
      </div>
    </section>
  );
}
