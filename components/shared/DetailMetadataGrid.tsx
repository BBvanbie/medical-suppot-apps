"use client";

type DetailMetadataItem = {
  label: string;
  value: string;
};

type DetailMetadataGridProps = {
  items: DetailMetadataItem[];
  columnsClassName?: string;
  itemClassName?: string;
  valueClassName?: string;
};

export function DetailMetadataGrid({
  items,
  columnsClassName = "lg:grid-cols-5",
  itemClassName,
  valueClassName,
}: DetailMetadataGridProps) {
  return (
    <div className={`grid gap-2 ${columnsClassName}`.trim()}>
      {items.map((item) => (
        <div key={`${item.label}-${item.value}`} className={`ds-muted-panel rounded-2xl px-3 py-3 ${itemClassName ?? ""}`.trim()}>
          <p className="ds-text-2xs font-semibold ds-track-section text-slate-400">{item.label}</p>
          <p className={`mt-1 ds-text-xs-plus font-semibold leading-5 text-slate-800 ${valueClassName ?? ""}`.trim()}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}
