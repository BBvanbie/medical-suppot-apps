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
  panelClassName = "ds-radius-hero bg-slate-950 px-5 py-5 text-white ds-shadow-dark-panel",
}: PriorityListPanelProps) {
  return (
    <section className={panelClassName}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="ds-text-xs-compact font-semibold ds-track-eyebrow-wide text-slate-400">{kicker}</p>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-white">{title}</h2>
        </div>
        {badge ? <span className="rounded-full bg-white/10 px-3 py-1 ds-text-xs-compact font-semibold text-slate-200">{badge}</span> : null}
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
