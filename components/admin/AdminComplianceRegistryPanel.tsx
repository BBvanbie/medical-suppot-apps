"use client";

import { useDeferredValue, useMemo, useState } from "react";

import type { AdminComplianceRegistryEntry } from "@/lib/admin/adminComplianceDefinitions";

type AdminComplianceRegistryPanelProps = {
  entries: AdminComplianceRegistryEntry[];
};

const scopeOrder = ["hospital", "ems", "admin", "shared"] as const;

export function AdminComplianceRegistryPanel({ entries }: AdminComplianceRegistryPanelProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();

  const filteredEntries = useMemo(() => {
    if (!normalizedQuery) return entries;
    return entries.filter((item) => {
      const haystack = [item.scope, item.label, String(item.organizationId), item.sourceTable ?? "", item.isActive ? "active" : "inactive"]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [entries, normalizedQuery]);

  return (
    <div className="space-y-4" data-testid="compliance-registry-panel">
      <label className="block">
        <span className="ds-field-label">registry 検索</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="病院名 / EMS 名 / operating unit / ID"
          className="ds-field"
          data-testid="compliance-registry-search"
        />
        <p className="mt-1 text-xs text-slate-500">{filteredEntries.length} 件表示中 / 全 {entries.length} 件</p>
      </label>

      <div className="grid gap-3">
        {scopeOrder.map((scope) => {
          const items = filteredEntries.filter((item) => item.scope === scope);
          return (
            <article key={scope} className="rounded-[22px] border border-slate-200/80 bg-white px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">{scope.toUpperCase()}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{items.length} 件</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                  {items.filter((item) => item.isActive).length} active
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {items.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-500">該当候補はありません。</div>
                ) : (
                  items.map((item) => (
                    <div
                      key={`${item.scope}:${item.organizationId}`}
                      className="rounded-2xl bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-600"
                      data-testid={`compliance-registry-entry-${item.scope}-${item.organizationId}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">{item.label}</span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600">ID {item.organizationId}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${item.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                          {item.isActive ? "active" : "inactive"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{item.sourceTable ?? "-"}</p>
                    </div>
                  ))
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
