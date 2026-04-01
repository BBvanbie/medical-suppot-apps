import { adminActionButtonClass } from "@/components/admin/AdminWorkbench";

type AdminEntityTableColumn = {
  key: string;
  label: string;
};

type AdminEntityRow = Record<string, string | number | boolean | null>;

type AdminEntityTableProps = {
  columns: AdminEntityTableColumn[];
  rows: AdminEntityRow[];
  emptyMessage: string;
  selectedRowId: number | null;
  onSelect: (rowId: number) => void;
};

function renderValue(value: string | number | boolean | null) {
  if (value == null || value === "") return <span className="text-slate-300">-</span>;
  if (typeof value === "boolean") {
    return (
      <span
        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          value ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
        }`}
      >
        {value ? "有効" : "無効"}
      </span>
    );
  }
  return String(value);
}

export function AdminEntityTable({ columns, rows, emptyMessage, selectedRowId, onSelect }: AdminEntityTableProps) {
  return (
    <div className="space-y-2.5">
      {rows.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">{emptyMessage}</div>
      ) : (
        rows.map((row) => {
          const rowId = Number(row.id ?? 0);
          const isSelected = rowId === selectedRowId;
          return (
            <button
              key={String(row.id ?? `${row[columns[0]?.key] ?? "row"}`)}
              type="button"
              onClick={() => onSelect(rowId)}
              className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${
                isSelected
                  ? "border-orange-200 bg-orange-50/70"
                  : "border-slate-200 bg-slate-50/70 hover:border-orange-200 hover:bg-orange-50/40"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid min-w-0 flex-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {columns.map((column) => (
                    <div key={column.key} className="rounded-2xl bg-white px-3 py-3">
                      <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">{column.label}</p>
                      <div className="mt-1 text-[12px] font-semibold text-slate-800">{renderValue(row[column.key] ?? null)}</div>
                    </div>
                  ))}
                </div>
                <span className={`${isSelected ? adminActionButtonClass("primary") : adminActionButtonClass("secondary")} shrink-0`}>
                  {isSelected ? "編集中" : "詳細"}
                </span>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}
