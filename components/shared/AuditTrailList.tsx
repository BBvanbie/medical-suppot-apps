"use client";

type AuditTrailListItem = {
  id: string | number;
  title: string;
  timestamp: string;
  actorRole?: string;
  description?: string;
};

type AuditTrailListProps = {
  items: AuditTrailListItem[];
  emptyMessage?: string;
};

export function AuditTrailList({
  items,
  emptyMessage = "履歴はまだありません。",
}: AuditTrailListProps) {
  return (
    <div className="mt-4 space-y-2.5">
      {items.length === 0 ? <p className="text-sm text-slate-500">{emptyMessage}</p> : null}
      {items.map((item) => (
        <div key={item.id} className="ds-muted-panel ds-radius-section px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
            <p className="text-xs text-slate-500">{item.timestamp}</p>
          </div>
          {item.actorRole ? <p className="mt-1 text-xs text-slate-500">実行ロール: {item.actorRole}</p> : null}
          {item.description ? <p className="mt-1 text-xs text-slate-500">{item.description}</p> : null}
        </div>
      ))}
    </div>
  );
}
