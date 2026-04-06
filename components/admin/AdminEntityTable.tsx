import { adminActionButtonClass } from "@/components/admin/AdminWorkbench";
import { DetailMetadataGrid } from "@/components/shared/DetailMetadataGrid";
import { SelectableRowCard } from "@/components/shared/SelectableRowCard";

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

export function AdminEntityTable({ columns, rows, emptyMessage, selectedRowId, onSelect }: AdminEntityTableProps) {
  return (
    <div className="space-y-2.5">
      {rows.length === 0 ? (
        <div className="ds-muted-panel rounded-2xl px-4 py-8 text-center text-sm text-slate-500">{emptyMessage}</div>
      ) : (
        rows.map((row) => {
          const rowId = Number(row.id ?? 0);
          const isSelected = rowId === selectedRowId;
          return (
            <SelectableRowCard
              key={String(row.id ?? `${row[columns[0]?.key] ?? "row"}`)}
              selected={isSelected}
              onSelect={() => onSelect(rowId)}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <DetailMetadataGrid
                    columnsClassName="md:grid-cols-2 xl:grid-cols-3"
                    itemClassName="bg-white"
                    items={columns.map((column) => ({
                      label: column.label,
                      value:
                        row[column.key] == null || row[column.key] === ""
                          ? "-"
                          : typeof row[column.key] === "boolean"
                            ? (row[column.key] ? "有効" : "無効")
                            : String(row[column.key]),
                    }))}
                  />
                </div>
                <span className={`${isSelected ? adminActionButtonClass("primary") : adminActionButtonClass("secondary")} shrink-0`}>
                  {isSelected ? "編集中" : "詳細"}
                </span>
              </div>
            </SelectableRowCard>
          );
        })
      )}
    </div>
  );
}
