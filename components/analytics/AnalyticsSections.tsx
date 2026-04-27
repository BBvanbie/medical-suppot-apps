import Link from "next/link";

import { SectionPanelFrame } from "@/components/shared/SectionPanelFrame";
import type { AnalyticsRangeKey, AnalyticsSelectOption, DashboardKpi, DistributionItem, PendingItem, TrendPoint } from "@/lib/dashboardAnalytics";

const toneClasses: Record<NonNullable<DashboardKpi["tone"]>, string> = {
  blue: "bg-blue-50 text-blue-700 ring-blue-200/80",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200/80",
  amber: "bg-amber-50 text-amber-700 ring-amber-200/80",
  rose: "bg-rose-50 text-rose-700 ring-rose-200/80",
  slate: "bg-slate-100 text-slate-700 ring-slate-200/80",
};

const distributionToneClasses = {
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  orange: "bg-orange-500",
  rose: "bg-rose-500",
  slate: "bg-slate-900",
} as const;

const alertToneClasses = {
  amber: "rounded-2xl bg-amber-50/75 p-3 text-sm text-amber-900 ring-1 ring-amber-200/80",
  orange: "rounded-2xl border border-amber-200/70 bg-amber-50/75 px-4 py-3 text-sm text-amber-900",
  slate: "rounded-2xl bg-slate-50/80 p-3 text-sm text-slate-700 ring-1 ring-slate-200/80",
} as const;

const rangeItems: Array<{ key: AnalyticsRangeKey; label: string }> = [
  { key: "today", label: "今日" },
  { key: "7d", label: "直近7日" },
  { key: "30d", label: "直近30日" },
  { key: "90d", label: "直近90日" },
];

export function AnalyticsHeader({
  eyebrow,
  title,
  description,
  rangeLabel,
  badgeClassName = "rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200/80",
}: {
  eyebrow: string;
  title: string;
  description: string;
  rangeLabel?: string;
  badgeClassName?: string;
}) {
  return (
    <header className="mb-5">
      <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500">{eyebrow}</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {rangeLabel ? <p className={badgeClassName}>対象: {rangeLabel}</p> : null}
      </div>
    </header>
  );
}

export function AnalyticsRangeTabs({
  basePath,
  activeRange,
  activeClassName = "bg-slate-900 text-white ring-slate-900",
  inactiveClassName = "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50",
}: {
  basePath: string;
  activeRange: AnalyticsRangeKey;
  activeClassName?: string;
  inactiveClassName?: string;
}) {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {rangeItems.map((item) => (
        <Link
          key={item.key}
          href={`${basePath}?range=${item.key}`}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
            activeRange === item.key ? activeClassName : inactiveClassName
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

export function AnalyticsFilterBar({
  action,
  range,
  filters,
  submitClassName = "h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white",
  rangeCardClassName = "mb-5 flex flex-wrap items-end gap-3 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.12)]",
  selectClassName = "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700",
}: {
  action: string;
  range: AnalyticsRangeKey;
  filters: Array<{ name: string; label: string; value: string; options: AnalyticsSelectOption[] }>;
  submitClassName?: string;
  rangeCardClassName?: string;
  selectClassName?: string;
}) {
  return (
    <form method="get" action={action} className={rangeCardClassName}>
      <input type="hidden" name="range" value={range} />
      {filters.map((filter) => (
        <label key={filter.name} className="min-w-[180px] flex-1">
          <span className="mb-1.5 block text-xs font-semibold text-slate-500">{filter.label}</span>
          <select name={filter.name} defaultValue={filter.value} className={selectClassName}>
            {filter.options.map((option) => (
              <option key={`${filter.name}-${option.value}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      <button type="submit" className={submitClassName}>絞り込む</button>
    </form>
  );
}

export function DashboardKpiGrid({
  items,
  cardToneResolver,
}: {
  items: DashboardKpi[];
  cardToneResolver?: (item: DashboardKpi, index: number) => string | undefined;
}) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item, index) => {
        const tone = toneClasses[item.tone ?? "slate"];
        return (
          <article
            key={item.label}
            className={cardToneResolver?.(item, index) ?? "rounded-3xl bg-white p-4 ring-1 ring-slate-200/80 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.18)]"}
          >
            <div className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${tone}`}>{item.label}</div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{item.value}</p>
            {item.hint ? <p className="mt-2 text-xs text-slate-500">{item.hint}</p> : null}
          </article>
        );
      })}
    </section>
  );
}

export function AnalyticsSection({
  title,
  description,
  children,
  className = "rounded-3xl bg-white p-5 ring-1 ring-slate-200/80 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.18)]",
  titleClassName = "text-lg font-bold text-slate-900",
  descriptionClassName = "mt-1 text-sm text-slate-500",
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}) {
  return (
    <SectionPanelFrame
      kicker="ANALYTICS SECTION"
      title={title}
      description={description}
      className={className}
      headerClassName="mb-4"
      kickerClassName="sr-only"
      titleClassName={titleClassName}
      descriptionClassName={descriptionClassName}
    >
      {children}
    </SectionPanelFrame>
  );
}

export function DistributionBars({
  items,
  valueSuffix = "件",
  secondaryLabel,
  barTone = "blue",
}: {
  items: DistributionItem[];
  valueSuffix?: string;
  secondaryLabel?: string;
  barTone?: keyof typeof distributionToneClasses;
}) {
  const max = Math.max(...items.map((item) => Math.max(item.value, item.secondaryValue ?? 0)), 1);
  return (
    <div className="space-y-3">
      {items.length === 0 ? <p className="text-sm text-slate-500">データがありません。</p> : null}
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <p className="font-medium text-slate-700">{item.label}</p>
            <p className="text-xs text-slate-500">
              {item.value}{valueSuffix}
              {item.secondaryValue != null ? ` / ${secondaryLabel ?? item.secondaryLabel ?? "補助"} ${item.secondaryValue}${valueSuffix}` : ""}
            </p>
          </div>
          <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
            <div className={distributionToneClasses[barTone]} style={{ width: `${(item.value / max) * 100}%` }} />
            {item.secondaryValue != null ? <div className="bg-slate-300" style={{ width: `${(item.secondaryValue / max) * 100}%` }} /> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TrendBars({ items, valueSuffix = "分", barTone = "emerald" }: { items: TrendPoint[]; valueSuffix?: string; barTone?: keyof typeof distributionToneClasses }) {
  const max = Math.max(...items.map((item) => Math.max(item.value, item.secondaryValue ?? 0)), 1);
  return (
    <div className="grid gap-2">
      {items.length === 0 ? <p className="text-sm text-slate-500">データがありません。</p> : null}
      {items.map((item) => (
        <div key={item.label} className="grid grid-cols-[64px_minmax(0,1fr)_56px] items-center gap-3 text-xs">
          <span className="font-semibold text-slate-500">{item.label}</span>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${distributionToneClasses[barTone]}`} style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
          <span className="text-right font-semibold text-slate-700">{item.value}{valueSuffix}</span>
        </div>
      ))}
    </div>
  );
}

export function PendingList({ items }: { items: PendingItem[] }) {
  return (
    <div className="space-y-2">
      {items.length === 0 ? <p className="text-sm text-slate-500">未対応案件はありません。</p> : null}
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl bg-slate-50/80 p-3 ring-1 ring-slate-200/70">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">{item.title}</p>
              <p className="mt-1 text-xs text-slate-500">{item.meta}</p>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200/80">{item.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AlertList({ items, tone = "amber", emptyMessage = "アラートはありません。" }: { items: string[]; tone?: keyof typeof alertToneClasses; emptyMessage?: string }) {
  return (
    <div className="space-y-2">
      {items.length === 0 ? <p className="text-sm text-slate-500">{emptyMessage}</p> : null}
      {items.map((item, index) => (
        <div key={`${item}-${index}`} className={alertToneClasses[tone]}>
          {item}
        </div>
      ))}
    </div>
  );
}
