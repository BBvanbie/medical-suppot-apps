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
      className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-900 ds-shadow-emergency-banner"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
        <ExclamationTriangleIcon className="h-4.5 w-4.5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="ds-text-2xs font-semibold ds-track-eyebrow-wide text-rose-700">TRIAGE MODE</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">大規模災害向けの優先導線で表示しています</p>
        <p className="mt-1 text-xs leading-5 text-slate-700">{getEmsOperationalModeBannerText(operationalMode)}</p>
      </div>
    </div>
  );
}
