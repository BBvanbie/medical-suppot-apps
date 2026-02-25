"use client";

import { useState } from "react";

import { CasesTable } from "./CasesTable";
import { Sidebar } from "./Sidebar";

export function HomeDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="dashboard-shell h-screen overflow-hidden bg-[var(--dashboard-bg)] text-slate-900">
      <div className="flex h-full">
        <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen((v) => !v)} />

        <main className="flex min-w-0 flex-1 flex-col px-8 py-6">
          <header className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-teal)]">EMS SUPPORT</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">ホームダッシュボード</h1>
              <p className="mt-1 text-sm text-slate-500">
                搬送判断に必要な過去事案を迅速に参照できます。
              </p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-2 text-right">
              <p className="text-xs font-semibold tracking-wide text-amber-700">稼働状態</p>
              <p className="text-sm font-bold text-amber-900">通常運用</p>
            </div>
          </header>

          <CasesTable />
        </main>
      </div>
    </div>
  );
}
