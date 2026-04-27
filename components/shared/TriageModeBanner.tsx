"use client";

import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";

import { getEmsOperationalModeBannerText } from "@/lib/emsOperationalMode";
import type { EmsOperationalMode } from "@/lib/emsSettingsValidation";

type TriageModeBannerProps = {
  operationalMode: EmsOperationalMode;
};

export function TriageModeBanner({ operationalMode }: TriageModeBannerProps) {
  if (operationalMode !== "TRIAGE") return null;

  return (
    <div
      data-testid="ems-triage-banner"
      className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-900 shadow-[0_16px_34px_-30px_rgba(190,24,93,0.42)]"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
        <ExclamationTriangleIcon className="h-4.5 w-4.5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold tracking-[0.18em] text-rose-700">TRIAGE MODE</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">大規模災害向けの優先導線で表示しています</p>
        <p className="mt-1 text-xs leading-5 text-slate-700">{getEmsOperationalModeBannerText(operationalMode)}</p>
      </div>
    </div>
  );
}
