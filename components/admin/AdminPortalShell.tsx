"use client";

import { useState } from "react";

import { AdminSidebar } from "@/components/admin/AdminSidebar";

type AdminPortalShellProps = {
  children: React.ReactNode;
  adminName: string;
  adminCode: string;
};

export function AdminPortalShell({ children, adminName, adminCode }: AdminPortalShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="dashboard-shell h-screen overflow-hidden bg-[#f8fafc] text-slate-900">
      <div className="flex h-full">
        <AdminSidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen((value) => !value)}
          adminName={adminName}
          adminCode={adminCode}
        />
        <main className="app-shell-main min-w-0 flex-1 overflow-auto bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.12),transparent_26%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)]">
          {children}
        </main>
      </div>
    </div>
  );
}
