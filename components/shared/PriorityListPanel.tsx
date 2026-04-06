import type { ReactNode } from "react";

type PriorityListPanelProps = {
  kicker: string;
  title: string;
  badge?: string;
  items: ReactNode[];
  emptyMessage: string;
  panelClassName?: string;
};

export function PriorityListPanel({
  kicker,
  title,
  badge,
  items,
  emptyMessage,
  panelClassName = "rounded-[28px] bg-slate-950 px-5 py-5 text-white shadow-[0_20px_48px_-38px_rgba(15,23,42,0.55)]",
}: PriorityListPanelProps) {
  return (
    <section className={panelClassName}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-400">{kicker}</p>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-white">{title}</h2>
        </div>
        {badge ? <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-slate-200">{badge}</span> : null}
      </div>
      <div className="mt-4 space-y-2.5">
        {items.length === 0 ? <p className="text-sm text-slate-300">{emptyMessage}</p> : null}
        {items.map((item, index) => (
          <div key={index}>{item}</div>
        ))}
      </div>
    </section>
  );
}
