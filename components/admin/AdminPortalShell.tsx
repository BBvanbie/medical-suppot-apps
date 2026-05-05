"use client";

import { useState } from "react";

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { TrainingModeBanner } from "@/components/shared/TrainingModeBanner";
import type { AppMode } from "@/lib/appMode";

type AdminPortalShellProps = {
  children: React.ReactNode;
  adminName: string;
  adminCode: string;
  currentMode?: AppMode;
};

export function AdminPortalShell({ children, adminName, adminCode, currentMode = "LIVE" }: AdminPortalShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="dashboard-shell h-screen overflow-hidden ds-bg-slate-canvas text-slate-900">
      <div className="flex h-full">
        <AdminSidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen((value) => !value)}
          adminName={adminName}
          adminCode={adminCode}
        />
        <main className="app-shell-main min-w-0 flex-1 overflow-auto ds-bg-gradient-admin-shell">
          <div className="mb-3 flex justify-end">
            <TrainingModeBanner mode={currentMode} />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
