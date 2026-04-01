"use client";

type EmsMetricItem = {
  label: string;
  value: string;
  hint?: string;
};

type EmsMetricStripProps = {
  title: string;
  items: EmsMetricItem[];
};

export function EmsMetricStrip({ title, items }: EmsMetricStripProps) {
  return (
    <section className="rounded-[26px] bg-white/92 px-5 py-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.22)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] text-slate-400">{title}</p>
          <h2 className="mt-1 text-base font-bold tracking-tight text-slate-900">現況の読み取り</h2>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-semibold text-blue-700">EMS</span>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <article key={item.label} className="rounded-[18px] bg-slate-50/90 px-4 py-4">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400">{item.label}</p>
            <p className="mt-2 whitespace-nowrap text-[22px] font-bold tracking-[-0.03em] text-slate-950">{item.value}</p>
            {item.hint ? <p className="mt-1 text-[11px] leading-5 text-slate-500">{item.hint}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
