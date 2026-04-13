"use client";

type SummaryItem = {
  label: string;
  value: string | number;
  hint: string;
  tone?: "neutral" | "priority" | "action" | "warning";
};

type HospitalListSummaryStripProps = {
  items: SummaryItem[];
};

function toneClass(tone: SummaryItem["tone"] = "neutral") {
  if (tone === "priority") return "bg-emerald-50/80 text-emerald-950";
  if (tone === "action") return "bg-blue-50/80 text-blue-950";
  if (tone === "warning") return "bg-amber-50/80 text-amber-950";
  return "bg-slate-50/80 text-slate-950";
}

export function HospitalListSummaryStrip({ items }: HospitalListSummaryStripProps) {
  return (
    <section className="mb-4 grid gap-3 xl:grid-cols-4">
      {items.map((item) => (
        <article key={item.label} className={`rounded-[22px] px-4 py-4 ${toneClass(item.tone)}`}>
          <p className="text-[10px] font-semibold tracking-[0.18em] text-slate-500">{item.label}</p>
          <p className="mt-2 text-[26px] font-bold tracking-[-0.03em]">{item.value}</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">{item.hint}</p>
        </article>
      ))}
    </section>
  );
}
