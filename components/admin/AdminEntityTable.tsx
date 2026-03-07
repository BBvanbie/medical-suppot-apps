import { SettingActionButton } from "@/components/settings/SettingActionButton";

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
        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
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
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="overflow-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3 text-left text-xs font-semibold tracking-[0.12em] text-slate-500">
                  {column.label}
                </th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-semibold tracking-[0.12em] text-slate-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-sm text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const rowId = Number(row.id ?? 0);
                const isSelected = rowId === selectedRowId;
                return (
                  <tr key={String(row.id ?? `${row[columns[0]?.key] ?? "row"}`)} className={`align-top ${isSelected ? "bg-amber-50/60" : ""}`}>
                    {columns.map((column) => (
                      <td key={column.key} className="px-4 py-3 text-sm text-slate-700">
                        {renderValue(row[column.key] ?? null)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <SettingActionButton tone={isSelected ? "primary" : "secondary"} className="h-9 px-3 text-xs" onClick={() => onSelect(rowId)}>
                        {isSelected ? "選択中" : "詳細"}
                      </SettingActionButton>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
