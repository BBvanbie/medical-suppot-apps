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
      icon={<span className={`rounded-full px-3 py-1 text-[10px] font-semibold ${isTriage ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-700"}`}>EMS</span>}
      className={`rounded-[26px] bg-white/92 px-5 py-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.22)] ${isTriage ? "border border-rose-200/80" : ""}`}
      iconClassName=""
      headerClassName="flex items-start justify-between gap-3"
      kickerClassName="text-[10px] font-semibold tracking-[0.18em] text-slate-400"
      titleClassName="mt-1 text-base font-bold tracking-tight text-slate-900"
    >
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <article key={item.label} className={`rounded-[18px] px-4 py-4 ${isTriage ? "bg-rose-50/60" : "bg-slate-50/90"}`}>
            <p className={`text-[10px] font-semibold tracking-[0.16em] ${isTriage ? "text-rose-700" : "text-slate-400"}`}>{item.label}</p>
            <p className="mt-2 whitespace-nowrap text-[22px] font-bold tracking-[-0.03em] text-slate-950">{item.value}</p>
            {item.hint ? <p className="mt-1 text-[11px] leading-5 text-slate-500">{item.hint}</p> : null}
          </article>
        ))}
      </div>
    </MetricPanelFrame>
  );
}
