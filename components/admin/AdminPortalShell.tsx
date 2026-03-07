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
    <div className="dashboard-shell h-screen overflow-hidden bg-[var(--dashboard-bg)] text-slate-900">
      <div className="flex h-full">
        <AdminSidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen((value) => !value)}
          adminName={adminName}
          adminCode={adminCode}
        />
        <main className="min-w-0 flex-1 overflow-auto px-4 py-6 sm:px-5 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
