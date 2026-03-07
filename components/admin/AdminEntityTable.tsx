type AdminEntityTableColumn = {
  key: string;
  label: string;
};

type AdminEntityRow = Record<string, string | number | null>;

type AdminEntityTableProps = {
  columns: AdminEntityTableColumn[];
  rows: AdminEntityRow[];
  emptyMessage: string;
};

export function AdminEntityTable({ columns, rows, emptyMessage }: AdminEntityTableProps) {
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
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={String(row.id ?? `${row[columns[0]?.key] ?? "row"}`)} className="align-top">
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3 text-sm text-slate-700">
                      {row[column.key] == null || row[column.key] === "" ? <span className="text-slate-300">-</span> : String(row[column.key])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
