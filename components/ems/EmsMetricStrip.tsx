"use client";

import { MetricPanelFrame } from "@/components/shared/MetricPanelFrame";

type EmsMetricItem = {
  label: string;
  value: string;
  hint?: string;
};

type EmsMetricStripProps = {
  title: string;
  items: EmsMetricItem[];
  operationTone?: "standard" | "triage";
};

export function EmsMetricStrip({ title, items, operationTone = "standard" }: EmsMetricStripProps) {
  const isTriage = operationTone === "triage";
  return (
    <MetricPanelFrame
      kicker={title}
      title="現況の読み取り"
      icon={<span className={`rounded-full px-3 py-1 ds-text-2xs font-semibold ${isTriage ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-700"}`}>EMS</span>}
      className={`ds-radius-panel-lg bg-white/92 px-5 py-4 ds-shadow-card-soft ${isTriage ? "border border-rose-200/80" : ""}`}
      iconClassName=""
      headerClassName="flex items-start justify-between gap-3"
      kickerClassName="ds-text-2xs font-semibold ds-track-eyebrow-wide text-slate-400"
      titleClassName="mt-1 text-base font-bold tracking-tight text-slate-900"
    >
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <article key={item.label} className={`ds-radius-callout px-4 py-4 ${isTriage ? "bg-rose-50/60" : "bg-slate-50/90"}`}>
            <p className={`ds-text-2xs font-semibold ds-track-eyebrow ${isTriage ? "text-rose-700" : "text-slate-400"}`}>{item.label}</p>
            <p className="mt-2 whitespace-nowrap ds-text-title font-bold ds-track-display text-slate-950">{item.value}</p>
            {item.hint ? <p className="mt-1 ds-text-xs-compact leading-5 text-slate-500">{item.hint}</p> : null}
          </article>
        ))}
      </div>
    </MetricPanelFrame>
  );
}
