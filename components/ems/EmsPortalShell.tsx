"use client";

import { useState } from "react";

import { Sidebar } from "@/components/home/Sidebar";

type EmsPortalShellProps = {
  children: React.ReactNode;
  operatorName: string;
  operatorCode: string;
};

export function EmsPortalShell({ children, operatorName, operatorCode }: EmsPortalShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="dashboard-shell h-screen overflow-hidden bg-[var(--dashboard-bg)] text-slate-900" style={{ backgroundImage: "none" }}>
      <div className="flex h-full">
        <Sidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen((value) => !value)}
          operatorName={operatorName}
          operatorCode={operatorCode}
        />
        <main className="min-w-0 flex-1 overflow-auto px-4 py-6 sm:px-5 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
